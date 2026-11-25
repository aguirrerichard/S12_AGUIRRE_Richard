import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatearSoles } from "../utils/tarifario";
import {
  formatearNumeroTarjeta, formatearVencimiento, detectarMarca, validarFormularioTarjeta,
  validarCelular, validarCodigoAprobacion,
} from "../utils/validaciones";
import { usePendientesCliente } from "../hooks/usePendientesCliente";
import { obtenerRegistro, pagarConTarjeta, pagarConBilletera } from "../api/pagos.api";
import "../styles/pago.css";

const TARJETA_VACIA = { numero: "", vencimiento: "", cvv: "", titular: "" };
const BILLETERA_VACIA = { proveedor: "andipay", celular: "", codigo: "" };

export default function Pago() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { pendientes, cargando: cargandoLista, error: errorLista } = usePendientesCliente();
  const [registroId, setRegistroId] = useState("");
  const [registro, setRegistro] = useState(null);
  const [mensaje, setMensaje] = useState(null); // { texto, tipo }
  const [bloqueVisible, setBloqueVisible] = useState(false);
  const [metodo, setMetodo] = useState("tarjeta");
  const [tarjeta, setTarjeta] = useState(TARJETA_VACIA);
  const [billetera, setBilletera] = useState(BILLETERA_VACIA);
  const [errores, setErrores] = useState({});
  const [procesando, setProcesando] = useState(false);

  // 1. Cuando llega la lista de pendientes, decide qué solicitud mostrar
  useEffect(() => {
    if (cargandoLista) return;
    if (errorLista) {
      setMensaje({ texto: "No se pudo conectar con el servidor. Intenta nuevamente.", tipo: "error" });
      return;
    }
    if (pendientes.length === 0) {
      setMensaje({ texto: "No tienes solicitudes pendientes de pago.", tipo: "info" });
      return;
    }
    setBloqueVisible(true);
    const idUrl = params.get("id");
    if (idUrl && pendientes.some((p) => String(p.id) === idUrl)) setRegistroId(idUrl);
    else {
      setRegistroId(String(pendientes[0].id));
      if (idUrl) setMensaje({ texto: "La solicitud indicada ya no está pendiente de pago.", tipo: "info" });
    }
  }, [cargandoLista, errorLista, pendientes, params]);

  // 2. El monto SIEMPRE se lee de la base de datos (a través del backend)
  useEffect(() => {
    if (!registroId) return;
    obtenerRegistro(Number(registroId)).then(setRegistro).catch(console.error);
  }, [registroId]);

  const marcaDetectada = detectarMarca(tarjeta.numero) ?? "";

  // 3. Procesar un pago (común a tarjeta y billetera)
  async function procesar(operacion, limpiar) {
    if (!registro || registro.estado_pago !== "pendiente") {
      return setMensaje({ texto: "Selecciona una solicitud pendiente de pago.", tipo: "error" });
    }
    setProcesando(true); // evita el doble clic = doble cobro
    setMensaje({ texto: "Conectando con la entidad...", tipo: "info" });
    try {
      const resultado = await operacion();
      if (resultado.aprobado) {
        limpiar();
        setMensaje({ texto: `Pago aprobado. Operación ${resultado.codigo}. Redirigiendo a tu comprobante...`, tipo: "exito" });
        setTimeout(() => navigate(`/comprobante?op=${encodeURIComponent(resultado.codigo)}`), 1500);
        return; // se queda deshabilitado hasta redirigir
      }
      setMensaje({ texto: `Pago rechazado: ${resultado.motivo}`, tipo: "error" });
    } catch (error) {
      console.error(error);
      setMensaje({ texto: "No se pudo procesar el pago. Revisa tu conexión.", tipo: "error" });
    }
    setProcesando(false);
  }

  async function enviarTarjeta(e) {
    e.preventDefault();
    const { valido, errores: errs, marca, venc } = validarFormularioTarjeta(tarjeta);
    setErrores(errs);
    if (!valido) return;
    await procesar(
      () => pagarConTarjeta({ registroId: registro.id, numero: tarjeta.numero, mes: venc.mes, anio: venc.anio, cvv: tarjeta.cvv, marca }),
      () => setTarjeta(TARJETA_VACIA)
    );
  }

  async function enviarBilletera(e) {
    e.preventDefault();
    const celularOk = validarCelular(billetera.celular);
    const codigoOk = validarCodigoAprobacion(billetera.codigo);
    setErrores({
      celular: celularOk ? "" : "Celular de 9 dígitos que empiece con 9.",
      codigo: codigoOk ? "" : "El código tiene 6 dígitos.",
    });
    if (!celularOk || !codigoOk) return;
    await procesar(
      () => pagarConBilletera({
        registroId: registro.id, proveedor: billetera.proveedor,
        celular: billetera.celular, codigoAprobacion: billetera.codigo,
      }),
      () => setBilletera(BILLETERA_VACIA)
    );
  }

  const invalido = (campo) => (errores[campo] ? "true" : "false");

  return (
    <div className="pg-pago">
      <main className="contenedor-pago">
        <h2 className="titulo-pagina"><i className="fa-solid fa-shield-halved"></i> Pago en línea</h2>
        <p className="subtitulo-pagina">Derecho de prueba de contraste de medidor. Al pagar, tu reclamo queda habilitado para ser derivado a inspección.</p>

        <section className="tarjeta" aria-labelledby="t-resumen">
          <h3 id="t-resumen">Resumen</h3>
          <label htmlFor="registro">Solicitud a pagar</label>
          <select id="registro" name="registro" value={registroId} disabled={pendientes.length === 0}
            onChange={(e) => setRegistroId(e.target.value)}>
            {pendientes.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo_seguimiento} — {formatearSoles(Number(p.monto_calculado))}</option>
            ))}
          </select>
          <p className="total-pagar">
            Total a pagar: <strong id="resumen-monto">{registro ? formatearSoles(Number(registro.monto_calculado)) : "—"}</strong>
          </p>
        </section>

        <p id="mensaje-pago" role="status" aria-live="polite" className={mensaje ? `mensaje mensaje--${mensaje.tipo}` : ""}>
          {mensaje?.texto}
        </p>

        {bloqueVisible && (
          <section className="tarjeta" id="bloque-pago" aria-label="Datos de pago">
            <fieldset className="selector-metodo" id="selector-metodo">
              <legend>Método de pago</legend>
              <label className="opcion-metodo">
                <input type="radio" name="metodo" value="tarjeta" checked={metodo === "tarjeta"} onChange={() => setMetodo("tarjeta")} />{" "}
                <i className="fa-regular fa-credit-card"></i> Tarjeta de débito o crédito
              </label>
              <label className="opcion-metodo">
                <input type="radio" name="metodo" value="billetera" checked={metodo === "billetera"} onChange={() => setMetodo("billetera")} />{" "}
                <i className="fa-solid fa-wallet"></i> Billetera electrónica
              </label>
            </fieldset>

            {metodo === "tarjeta" ? (
              <form id="form-tarjeta" noValidate onSubmit={enviarTarjeta}>
                <div className="grupo">
                  <label htmlFor="numero">Número de tarjeta</label>
                  <input id="numero" name="numero" inputMode="numeric" autoComplete="cc-number" maxLength={23} required
                    aria-invalid={invalido("numero")} value={tarjeta.numero}
                    onChange={(e) => setTarjeta({ ...tarjeta, numero: formatearNumeroTarjeta(e.target.value) })} />
                  <span id="marca-detectada" className="marca">{marcaDetectada}</span>
                  <span id="error-numero" className="error">{errores.numero}</span>
                </div>

                <div className="fila-2">
                  <div className="grupo">
                    <label htmlFor="vencimiento">Vencimiento (MM/AA)</label>
                    <input id="vencimiento" name="vencimiento" inputMode="numeric" autoComplete="cc-exp" maxLength={5}
                      placeholder="MM/AA" required aria-invalid={invalido("vencimiento")} value={tarjeta.vencimiento}
                      onChange={(e) => setTarjeta({ ...tarjeta, vencimiento: formatearVencimiento(e.target.value) })} />
                    <span id="error-vencimiento" className="error">{errores.vencimiento}</span>
                  </div>
                  <div className="grupo">
                    <label htmlFor="cvv">CVV</label>
                    <input id="cvv" name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} required
                      aria-invalid={invalido("cvv")} value={tarjeta.cvv}
                      onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value })} />
                    <span id="error-cvv" className="error">{errores.cvv}</span>
                  </div>
                </div>

                <div className="grupo">
                  <label htmlFor="titular">Nombre del titular</label>
                  <input id="titular" name="titular" autoComplete="cc-name" required aria-invalid={invalido("titular")}
                    value={tarjeta.titular} onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })} />
                  <span id="error-titular" className="error">{errores.titular}</span>
                </div>

                <button type="submit" className="btn-pagar" disabled={procesando}>
                  {procesando ? "Procesando..." : <><i className="fa-solid fa-lock"></i> Pagar con tarjeta</>}
                </button>
              </form>
            ) : (
              <form id="form-billetera" noValidate onSubmit={enviarBilletera}>
                <div className="grupo">
                  <label htmlFor="proveedor">Billetera</label>
                  <select id="proveedor" name="proveedor" value={billetera.proveedor}
                    onChange={(e) => setBilletera({ ...billetera, proveedor: e.target.value })}>
                    <option value="andipay">AndiPay</option>
                    <option value="pagomovil">PagoMóvil</option>
                  </select>
                </div>

                <div className="grupo">
                  <label htmlFor="celular">Celular afiliado</label>
                  <input id="celular" name="celular" inputMode="numeric" autoComplete="tel-national" maxLength={9} required
                    aria-invalid={invalido("celular")} value={billetera.celular}
                    onChange={(e) => setBilletera({ ...billetera, celular: e.target.value })} />
                  <span id="error-celular" className="error">{errores.celular}</span>
                </div>

                <div className="grupo">
                  <label htmlFor="codigo">Código de aprobación (6 dígitos que muestra tu billetera)</label>
                  <input id="codigo" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
                    aria-invalid={invalido("codigo")} value={billetera.codigo}
                    onChange={(e) => setBilletera({ ...billetera, codigo: e.target.value })} />
                  <span id="error-codigo" className="error">{errores.codigo}</span>
                </div>

                <button type="submit" className="btn-pagar" disabled={procesando}>
                  {procesando ? "Procesando..." : <><i className="fa-solid fa-lock"></i> Pagar con billetera</>}
                </button>
              </form>
            )}

            <details className="ayuda-prueba">
              <summary>Datos de prueba (simulación académica)</summary>
              <ul>
                <li>Visa aprobada: 4111 1111 1111 1111 · 12/29 · CVV 123</li>
                <li>Visa sin saldo: 4000 0000 0000 0002 · 08/28 · CVV 456</li>
                <li>Mastercard crédito: 5555 5555 5555 4444 · 05/30 · CVV 789</li>
                <li>Mastercard bloqueada: 5105 1051 0510 5100 · 03/27 · CVV 321</li>
                <li>American Express: 3782 8224 6310 005 · 11/28 · CVV 1234</li>
                <li>AndiPay: 987654321 · código 123456 (PagoMóvil 912345678 · 654321 tiene saldo insuficiente)</li>
              </ul>
              <p>En un sistema real, los datos de la tarjeta los captura una pasarela certificada PCI DSS y nunca llegan a la base de datos del comercio.</p>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
