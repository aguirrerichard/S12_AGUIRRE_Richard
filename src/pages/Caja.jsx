import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { buscarPendientes, cobrarPresencial, listarPagosEnLinea, verificarPago, resumenDelDia } from "../api/caja.api";
import { mensajeDeError } from "../api/client";
import { formatearSoles, redondear } from "../utils/tarifario";
import "../styles/caja.css";

/* =========================================================
   B. INTERFAZ
   ========================================================= */

const NOMBRES_METODO = {
  tarjeta_debito: "Tarjeta de débito", tarjeta_credito: "Tarjeta de crédito",
  billetera: "Billetera electrónica", efectivo: "Efectivo", pos: "Tarjeta en POS",
};

// Fecha de HOY en Lima con formato AAAA-MM-DD (lo que espera <input type="date">)
const hoyEnLima = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

function describirMedio(p) {
  if (p.metodo === "billetera") return `Billetera ${p.proveedor_billetera} ${p.referencia}`;
  if (p.marca_tarjeta) return `${p.marca_tarjeta} ${p.referencia}`;
  return p.referencia ?? p.metodo;
}

const FORM_COBRO_VACIO = { metodo: "efectivo", recibido: "", referencia: "" };

export default function Caja() {
  const { usuario, logout } = useAuth();
  const { notificar } = useToast();
  const navigate = useNavigate();

  // Cobro presencial
  const [criterio, setCriterio] = useState("");
  const [pendientes, setPendientes] = useState([]);
  const [errorPendientes, setErrorPendientes] = useState(false);
  const [cobro, setCobro] = useState(null); // registro que se está cobrando
  const [formCobro, setFormCobro] = useState(FORM_COBRO_VACIO);
  const [errorCobro, setErrorCobro] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const [aviso, setAviso] = useState(null); // { codigo, vuelto }

  // Pagos en línea y resumen
  const [fecha, setFecha] = useState(hoyEnLima());
  const [soloPorVerificar, setSoloPorVerificar] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [avisoNuevos, setAvisoNuevos] = useState("");
  const ultimoIdVisto = useRef(null);

  // Diálogos nativos <dialog>
  const dialogoCobro = useRef(null);
  const dialogoConfirmar = useRef(null);
  const [confirmacion, setConfirmacion] = useState(null);

  // Cuadro de confirmación propio: promesa con true (confirmó) o false (canceló o pulsó Esc)
  const confirmar = (titulo, mensaje, texto = "Confirmar") =>
    new Promise((resolve) => setConfirmacion({ titulo, mensaje, texto, resolve }));

  useEffect(() => {
    const d = dialogoCobro.current;
    if (cobro && !d.open) d.showModal();
    if (!cobro && d.open) d.close();
  }, [cobro]);

  useEffect(() => {
    const d = dialogoConfirmar.current;
    if (confirmacion && !d.open) {
      d.returnValue = "";
      d.showModal();
    }
  }, [confirmacion]);

  // ---- Cobro presencial ----
  const pintarPendientes = useCallback(async (texto = "") => {
    try {
      setPendientes(await buscarPendientes(texto));
      setErrorPendientes(false);
    } catch (error) {
      console.error(error);
      setPendientes([]);
      setErrorPendientes(true);
    }
  }, []);

  // ---- Pagos en línea + resumen ----
  const refrescar = useCallback(async () => {
    try {
      const [lista, filas] = await Promise.all([listarPagosEnLinea(fecha, soloPorVerificar), resumenDelDia(fecha)]);
      setPagos(lista);
      setResumen(filas);

      // Aviso de pagos nuevos desde la última revisión
      const ids = lista.filter((p) => p.estado === "aprobado").map((p) => p.id);
      const maxId = ids.length ? Math.max(...ids) : 0;
      if (ultimoIdVisto.current !== null && maxId > ultimoIdVisto.current) {
        const nuevos = ids.filter((id) => id > ultimoIdVisto.current).length;
        setAvisoNuevos(`Ingresaron ${nuevos} pago(s) nuevo(s) por la pasarela.`);
      }
      ultimoIdVisto.current = Math.max(ultimoIdVisto.current ?? 0, maxId);
    } catch (error) {
      console.error(error);
    }
  }, [fecha, soloPorVerificar]);

  useEffect(() => { pintarPendientes(); }, [pintarPendientes]);

  useEffect(() => {
    refrescar();
    // Revisa cada 15 segundos si entraron pagos por la pasarela (solo con la pestaña visible)
    const timer = setInterval(() => { if (!document.hidden) refrescar(); }, 15000);
    return () => clearInterval(timer);
  }, [refrescar]);

  function abrirCobro(registro) {
    setCobro(registro);
    setFormCobro(FORM_COBRO_VACIO);
    setErrorCobro("");
  }

  const esEfectivo = formCobro.metodo === "efectivo";
  const vuelto = cobro ? Number(formCobro.recibido) - Number(cobro.monto_calculado) : 0;

  async function enviarCobro(e) {
    e.preventDefault();
    setErrorCobro("");
    if (!esEfectivo && !/^\d{6,12}$/.test(formCobro.referencia)) {
      return setErrorCobro("Ingresa el número de voucher u operación (6 a 12 dígitos).");
    }
    if (esEfectivo && !(Number(formCobro.recibido) >= Number(cobro.monto_calculado))) {
      return setErrorCobro("El monto recibido es menor que el total.");
    }
    const total = formatearSoles(Number(cobro.monto_calculado));
    const acepta = await confirmar("Confirmar cobro",
      `¿Confirmar el cobro de ${total} por la solicitud ${cobro.codigo_seguimiento}?`, "Sí, cobrar");
    if (!acepta) return;

    setCobrando(true);
    try {
      const { codigo, vuelto: v } = await cobrarPresencial({
        registroId: cobro.id, metodo: formCobro.metodo,
        montoRecibido: Number(formCobro.recibido), referencia: formCobro.referencia,
      });
      setCobro(null);
      setAviso({ codigo, vuelto: v });
      notificar(`Cobro registrado. Operación ${codigo}.`, "exito");
      window.open(`/comprobante?op=${encodeURIComponent(codigo)}`, "_blank"); // si lo bloquea el navegador, queda el enlace del aviso
      await Promise.all([pintarPendientes(criterio), refrescar()]);
    } catch (error) {
      console.error(error);
      const yaPagada = error.response?.status === 409;
      setErrorCobro(yaPagada ? "Esta solicitud ya fue pagada." : mensajeDeError(error, "No se pudo registrar el cobro."));
      if (yaPagada) pintarPendientes(criterio);
    } finally {
      setCobrando(false);
    }
  }

  async function verificar(idPago) {
    const acepta = await confirmar("Verificar pago",
      "¿Confirmas que este pago figura en el estado de cuenta de la entidad?", "Sí, verificar");
    if (!acepta) return;
    try {
      await verificarPago(idPago);
      await refrescar();
    } catch (error) {
      console.error(error);
      notificar("No se pudo verificar el pago.", "error");
    }
  }

  function cambiarFecha(e) {
    ultimoIdVisto.current = null;
    setAvisoNuevos("");
    setFecha(e.target.value);
  }

  const totalDia = redondear(resumen.reduce((suma, f) => suma + Number(f.total), 0));

  return (
    <div className="pg-caja">
      <header>
        <div className="logo-container">
          <div className="logo-box"><i className="fa-solid fa-bolt"></i></div>
          <p className="logo-texto">LuzCentro Perú</p>
        </div>
        <p className="usuario-caja"><i className="fa-solid fa-cash-register"></i> Caja — <span>{usuario.nombre}</span></p>
        <div className="acciones-header">
          {usuario.rol !== "cajero" && (
            <a href="/panel" onClick={(e) => { e.preventDefault(); navigate("/panel"); }}>
              <i className="fa-solid fa-user-shield"></i> Gestión Global
            </a>
          )}
          <button type="button" onClick={() => { logout(); navigate("/login"); }}>
            <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
          </button>
        </div>
      </header>

      <main>
        <h1>Módulo de Caja</h1>
        <p id="aviso-cobro" role="status" aria-live="polite" className={aviso ? "aviso aviso--exito" : ""}>
          {aviso && (
            <>
              Cobro registrado. Operación {aviso.codigo}.{aviso.vuelto !== null ? ` Vuelto: ${formatearSoles(aviso.vuelto)}. ` : " "}
              <a href={`/comprobante?op=${encodeURIComponent(aviso.codigo)}`} target="_blank" rel="noopener">Ver comprobante</a>
            </>
          )}
        </p>

        <section aria-labelledby="t-cobro">
          <h2 id="t-cobro"><i className="fa-solid fa-hand-holding-dollar"></i> Cobro presencial</h2>
          <form id="form-buscar" role="search" onSubmit={(e) => { e.preventDefault(); pintarPendientes(criterio); }}>
            <label htmlFor="criterio">Código de seguimiento, DNI o nombre</label>
            <div className="fila-buscar">
              <input id="criterio" name="criterio" type="search" autoComplete="off" placeholder="Ej. COD-12345678, 70000012 o Ana"
                value={criterio} onChange={(e) => setCriterio(e.target.value)} />
              <button type="submit"><i className="fa-solid fa-magnifying-glass"></i> Buscar</button>
            </div>
          </form>
          <div className="contenedor-tabla">
            <table id="tabla-pendientes">
              <caption>Solicitudes pendientes de pago</caption>
              <thead>
                <tr><th scope="col">Código</th><th scope="col">Cliente</th><th scope="col">DNI</th><th scope="col">Monto</th><th scope="col">Acción</th></tr>
              </thead>
              <tbody>
                {pendientes.length === 0 && (
                  <tr><td colSpan={5} className="vacio">{errorPendientes ? "No se pudo consultar la base de datos." : "Sin solicitudes pendientes."}</td></tr>
                )}
                {pendientes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.codigo_seguimiento}</td>
                    <td>{r.cliente ?? "Atención presencial"}</td>
                    <td>{r.dni ?? "—"}</td>
                    <td>{formatearSoles(Number(r.monto_calculado))}</td>
                    <td><button type="button" onClick={() => abrirCobro(r)}>Cobrar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="t-linea">
          <h2 id="t-linea"><i className="fa-solid fa-globe"></i> Pagos recibidos por la pasarela</h2>
          <p id="aviso-nuevos" role="status" aria-live="polite" className={avisoNuevos ? "aviso aviso--info" : ""}>{avisoNuevos}</p>
          <div className="filtros">
            <div>
              <label htmlFor="fecha-caja">Fecha</label>
              <input id="fecha-caja" type="date" value={fecha} onChange={cambiarFecha} />
            </div>
            <label className="check">
              <input id="solo-por-verificar" type="checkbox" checked={soloPorVerificar}
                onChange={(e) => setSoloPorVerificar(e.target.checked)} /> Solo pendientes de verificar
            </label>
            <span className="nota-refresco">Se actualiza cada 15 s</span>
          </div>
          <div className="contenedor-tabla">
            <table id="tabla-en-linea">
              <caption>Operaciones en línea</caption>
              <thead>
                <tr>
                  <th scope="col">Hora</th><th scope="col">Operación</th><th scope="col">Solicitud</th><th scope="col">Cliente</th>
                  <th scope="col">Medio</th><th scope="col">Monto</th><th scope="col">Resultado</th><th scope="col">Verificación</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 && <tr><td colSpan={8} className="vacio">Sin operaciones en línea para esta fecha.</td></tr>}
                {pagos.map((p) => (
                  <tr key={p.id} className={p.estado === "rechazado" ? "fila-rechazada" : ""}>
                    <td>{new Date(p.fecha_pago).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{p.codigo_operacion}</td>
                    <td>{p.codigo_seguimiento}</td>
                    <td>{p.cliente ?? "—"}</td>
                    <td>{describirMedio(p)}</td>
                    <td>{formatearSoles(Number(p.monto))}</td>
                    <td>{p.estado === "aprobado" ? "Aprobado" : `Rechazado: ${p.motivo_rechazo}`}</td>
                    <td>
                      {p.estado === "aprobado" && !p.verificado && <button type="button" onClick={() => verificar(p.id)}>Verificar</button>}
                      {p.verificado && `Verificado por ${p.verificador}`}
                      {p.estado !== "aprobado" && !p.verificado && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="t-resumen">
          <h2 id="t-resumen"><i className="fa-solid fa-scale-balanced"></i> Resumen del día (cierre de caja)</h2>
          <div className="contenedor-tabla">
            <table id="tabla-resumen">
              <thead>
                <tr><th scope="col">Canal</th><th scope="col">Medio</th><th scope="col">Operaciones</th><th scope="col">Total</th></tr>
              </thead>
              <tbody>
                {resumen.length === 0 && <tr><td colSpan={4} className="vacio">Sin cobros aprobados en esta fecha.</td></tr>}
                {resumen.map((f) => (
                  <tr key={`${f.canal}-${f.metodo}`}>
                    <td>{f.canal === "pasarela" ? "En línea" : "Ventanilla"}</td>
                    <td>{NOMBRES_METODO[f.metodo] ?? f.metodo}</td>
                    <td>{String(f.operaciones)}</td>
                    <td>{formatearSoles(Number(f.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="total-dia">Total recaudado: <strong id="total-dia">{formatearSoles(totalDia)}</strong></p>
        </section>
      </main>

      <dialog id="dialogo-cobro" ref={dialogoCobro} aria-labelledby="t-dialogo" onClose={() => setCobro(null)}>
        <form id="form-cobro" onSubmit={enviarCobro}>
          <h2 id="t-dialogo">Registrar cobro</h2>
          <p className="resumen-cobro">
            Solicitud <strong>{cobro?.codigo_seguimiento}</strong> — Total <strong>{cobro && formatearSoles(Number(cobro.monto_calculado))}</strong>
          </p>

          <label htmlFor="metodo-caja">Medio de pago</label>
          <select id="metodo-caja" name="metodo" value={formCobro.metodo}
            onChange={(e) => { setFormCobro({ ...formCobro, metodo: e.target.value }); setErrorCobro(""); }}>
            <option value="efectivo">Efectivo</option>
            <option value="pos">Tarjeta en POS</option>
            <option value="andipay">Billetera AndiPay (QR)</option>
            <option value="pagomovil">Billetera PagoMóvil (QR)</option>
          </select>

          {esEfectivo ? (
            <div id="campo-recibido">
              <label htmlFor="monto-recibido">Monto recibido (S/)</label>
              <input id="monto-recibido" name="monto_recibido" type="number" min="0" step="0.01" required
                value={formCobro.recibido} onChange={(e) => setFormCobro({ ...formCobro, recibido: e.target.value })} />
              <p>Vuelto: <output id="vuelto">{formCobro.recibido === "" ? formatearSoles(0) : vuelto >= 0 ? formatearSoles(redondear(vuelto)) : "Monto insuficiente"}</output></p>
            </div>
          ) : (
            <div id="campo-referencia">
              <label htmlFor="referencia">N.° de voucher u operación (6 a 12 dígitos)</label>
              <input id="referencia" name="referencia" inputMode="numeric" maxLength={12} required
                value={formCobro.referencia} onChange={(e) => setFormCobro({ ...formCobro, referencia: e.target.value })} />
            </div>
          )}

          <p id="error-cobro" role="alert">{errorCobro}</p>

          <div className="botones-dialogo">
            <button type="button" id="cancelar-cobro" className="secundario" onClick={() => setCobro(null)}>Cancelar</button>
            <button type="submit" disabled={cobrando}>Confirmar cobro</button>
          </div>
        </form>
      </dialog>

      {/* Confirmación propia (reemplaza al confirm() nativo del navegador) */}
      <dialog id="dialogo-confirmar" ref={dialogoConfirmar} aria-labelledby="confirmar-titulo" aria-describedby="confirmar-mensaje"
        onClose={(e) => { confirmacion?.resolve(e.target.returnValue === "si"); setConfirmacion(null); }}>
        <form method="dialog">
          <h2 id="confirmar-titulo">{confirmacion?.titulo ?? "Confirmación"}</h2>
          <p id="confirmar-mensaje">{confirmacion?.mensaje}</p>
          <div className="botones-dialogo">
            <button type="submit" value="no" className="secundario">Cancelar</button>
            <button type="submit" value="si" id="confirmar-si">{confirmacion?.texto ?? "Confirmar"}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
