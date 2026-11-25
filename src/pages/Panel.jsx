import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useReclamos } from "../hooks/useReclamos";
import { obtenerPerfil } from "../api/auth.api";
import { crearReclamoPresencial, dictaminarReclamo, eliminarReclamo } from "../api/reclamos.api";
import { mensajeDeError } from "../api/client";
import { calcularMontoServicio, formatearSoles, requiereContraste } from "../utils/tarifario";
import "../styles/panel.css";

/* ---------- Turnos ---------- */
const TURNOS = {
  manana: { id: "manana", nombre: "Mañana", horario: "06:00 - 14:00" },
  tarde:  { id: "tarde",  nombre: "Tarde",  horario: "14:00 - 22:00" },
  noche:  { id: "noche",  nombre: "Noche",  horario: "22:00 - 06:00" },
};

const normalizarTurno = (turnoRaw) => {
  if (!turnoRaw) return TURNOS.manana;
  const t = turnoRaw.toString().toLowerCase().trim();
  if (t.includes("mañ") || t.includes("man") || t === "1") return TURNOS.manana;
  if (t.includes("tard") || t === "2") return TURNOS.tarde;
  if (t.includes("noc") || t === "3") return TURNOS.noche;
  return TURNOS.manana;
};

// Turno actual del sistema según la hora del navegador
const turnoActualSistema = () => {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 14) return TURNOS.manana;
  if (hora >= 14 && hora < 22) return TURNOS.tarde;
  return TURNOS.noche;
};

const esAdmin = (u) => u.rol === "administrador" || u.rol === "admin";
const estaEnTurno = (u) => esAdmin(u) || normalizarTurno(u.turno).id === turnoActualSistema().id;

/* ---------- Utilidades ---------- */
const NOMBRES_PAGO = { pendiente: "Pendiente", pagado: "Pagado", exonerado: "Exonerado" };

const claseEstado = (est) => {
  if (!est) return "registrado";
  const e = est.toString().toLowerCase().trim();
  if (e.includes("proceso")) return "en_proceso";
  if (e.includes("atend")) return "atendido";
  if (e.includes("rechaz")) return "rechazado";
  return "registrado";
};

const COLORES_ESTADO = { atendido: "#16a34a", rechazado: "#dc2626", en_proceso: "#d97706", registrado: "#2563eb" };

const formatearFecha = (valor) => {
  if (!valor) return new Date().toLocaleDateString("es-PE");
  const f = new Date(valor);
  return isNaN(f.getTime()) ? valor : f.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const soloDigitos = (v, max) => v.replace(/\D/g, "").slice(0, max);

const CREAR_VACIO = { dni: "", nombre: "", suministro: "", tipoMedidor: "monofasico", km: "0", comentario: "" };

const KPIS = [
  { clave: "total", clase: "total", icono: "fa-folder-open", titulo: "Total Reclamos" },
  { clave: "registrado", clase: "registrados", icono: "fa-clock", titulo: "Registrados" },
  { clave: "en_proceso", clase: "proceso", icono: "fa-spinner", titulo: "En Proceso" },
  { clave: "atendido", clase: "atendidos", icono: "fa-circle-check", titulo: "Atendidos" },
  { clave: "rechazado", clase: "rechazados", icono: "fa-circle-xmark", titulo: "Rechazados" },
];

export default function Panel() {
  const { usuario, logout, actualizarUsuario } = useAuth();
  const { notificar, confirmar } = useToast();
  const navigate = useNavigate();

  const { reclamos, estadoCarga, cargar } = useReclamos();
  const [busqueda, setBusqueda] = useState("");
  const [atencion, setAtencion] = useState(null); // reclamo en el modal de dictamen
  const [respuesta, setRespuesta] = useState("");
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [crear, setCrear] = useState(CREAR_VACIO);

  // Datos reales del usuario desde el backend (para traer el turno actualizado)
  useEffect(() => {
    obtenerPerfil()
      .then((perfil) => actualizarUsuario({ ...usuario, ...perfil }))
      .catch((err) => console.error("Error al consultar el perfil:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bloquea acciones de edición a un empleado fuera de su turno
  function permisoDeTurno() {
    if (estaEnTurno(usuario)) return true;
    const asignado = normalizarTurno(usuario.turno);
    const actual = turnoActualSistema();
    notificar(
      `ACCESO RESTRINGIDO POR TURNO: Asignado Turno ${asignado.nombre} (${asignado.horario}) - Sistema en Turno ${actual.nombre}. No puedes editar estando FUERA DE SERVICIO.`,
      "advertencia", 6000
    );
    return false;
  }

  const conteo = useMemo(() => {
    const c = { total: reclamos.length, registrado: 0, en_proceso: 0, atendido: 0, rechazado: 0 };
    reclamos.forEach((r) => { c[claseEstado(r.estado)]++; });
    return c;
  }, [reclamos]);

  const filtrados = useMemo(() => {
    const t = busqueda.toLowerCase().trim();
    if (!t) return reclamos;
    const coincide = (v) => v && v.toString().toLowerCase().includes(t);
    return reclamos.filter((r) =>
      coincide(r.codigo_seguimiento) || coincide(r.nombre_cliente) || coincide(r.dni) || coincide(r.numero_suministro));
  }, [reclamos, busqueda]);

  /* ---------- Acciones ---------- */
  function abrirAtencion(r) {
    setAtencion(r);
    setRespuesta(r.respuesta || "");
  }

  async function eliminar(id) {
    if (!permisoDeTurno()) return;
    const si = await confirmar("Eliminar Reclamo", "¿Confirmas que deseas eliminar permanentemente este registro de la base de datos?", "Confirmar");
    if (!si) return;
    try {
      await eliminarReclamo(id);
      notificar("Reclamo eliminado correctamente.", "exito");
      cargar();
    } catch (err) {
      console.error("Error al eliminar:", err);
      // 409 = el reclamo tiene pagos (aprobados o rechazados) y no se puede borrar
      if (err.response?.status === 409) notificar('No se puede eliminar: tiene historial de pagos. Cambie su estado a "Rechazado".', "advertencia", 6000);
      else notificar("No se pudo eliminar el registro.", "error");
    }
  }

  async function dictaminar(nuevoEstado, mensajeExito) {
    if (!permisoDeTurno() || !atencion) return;

    // El pago del derecho de contraste habilita derivar el reclamo a inspección:
    // mientras esté pendiente solo se puede rechazar.
    if (requiereContraste(atencion.motivo) && atencion.estado_pago === "pendiente" && nuevoEstado !== "rechazado") {
      return notificar("El derecho de contraste está pendiente de pago. No se puede derivar a inspección ni atender hasta que se pague.", "advertencia", 6000);
    }

    const texto = respuesta.trim();
    try {
      await dictaminarReclamo(atencion.id, nuevoEstado, texto);
      notificar(mensajeExito, "exito");
      setAtencion(null);
      cargar();
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      notificar("Ocurrió un error al registrar el dictamen.", "error");
    }
  }

  const montoCrear = calcularMontoServicio({ tipo_medidor: crear.tipoMedidor, km_fuera_zona: crear.km });
  const cerrarCrear = () => { setCrear(CREAR_VACIO); setCrearAbierto(false); };

  async function guardarNuevo(e) {
    e.preventDefault();
    const dni = crear.dni.trim();
    const suministro = crear.suministro.trim();
    if (!/^\d{6,8}$/.test(suministro)) return notificar("El N° de Suministro debe contener únicamente entre 6 y 8 dígitos numéricos.", "advertencia");
    if (!/^\d{8}$/.test(dni)) return notificar("El DNI debe contener exactamente 8 dígitos numéricos.", "advertencia");

    const km = Math.max(0, Number(crear.km) || 0);

    try {
      // Sin cuenta de cliente: paga luego en caja buscando el código. Monto y código los define el backend.
      const { codigo, monto_calculado } = await crearReclamoPresencial({
        dni, nombre: crear.nombre.trim(), suministro,
        tipo_medidor: crear.tipoMedidor, km_fuera_zona: km, comentario: crear.comentario.trim(),
      });
      notificar(`Reclamo registrado. Código: ${codigo}. Derecho de contraste: ${formatearSoles(Number(monto_calculado))} (se cobra en caja).`, "exito", 6000);
      cerrarCrear();
      cargar();
    } catch (err) {
      console.error("Error al guardar reclamo:", err);
      notificar(mensajeDeError(err, "No se pudo registrar el reclamo."), "error");
    }
  }

  const cambiarCrear = (campo, valor) => setCrear((c) => ({ ...c, [campo]: valor }));
  const turno = normalizarTurno(usuario.turno);
  const claseAtencion = atencion ? claseEstado(atencion.estado) : "registrado";

  return (
    <div className="pg-panel">
      <header id="menu-principal">
        <div className="logo-container">
          <div className="logo-box"><i className="fa-solid fa-bolt"></i></div>
          <h1 className="logo-texto">LuzCentro Perú</h1>
        </div>

        <div className="usuario-sesion-badge" id="info-usuario-sesion">
          <div className="user-avatar"><i className="fa-solid fa-user-gear"></i></div>
          <div className="user-details">
            <span className="user-name">{usuario.nombre || usuario.usuario || "Usuario Activo"}</span>
            <span className="user-role-shift">
              {esAdmin(usuario) ? (
                <><i className="fa-solid fa-shield-halved"></i> Administrador (Acceso Total 24/7)</>
              ) : (
                <>
                  Empleado | Turno {turno.nombre} ({turno.horario}){" "}
                  {estaEnTurno(usuario)
                    ? <span style={{ color: "#4ade80", fontWeight: 700 }}>● En Servicio</span>
                    : <span style={{ color: "#f87171", fontWeight: 700 }}>● Fuera de Servicio</span>}
                </>
              )}
            </span>
          </div>
        </div>

        <nav>
          <ul>
            <li><Link to="/"><i className="fa-solid fa-house"></i> Inicio</Link></li>
            <li><Link to="/panel" className="activo"><i className="fa-solid fa-user-shield"></i> Gestión Global</Link></li>
            <li>
              <button className="btn-cerrar-nav" onClick={() => { logout(); navigate("/login"); }}>
                <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
              </button>
            </li>
          </ul>
        </nav>
      </header>

      <div className="banner-interno">
        <div className="contenido-banner">
          <h2>Módulo de Gestión Operativa</h2>
          <p>Atención, consulta y resolución de reclamos por cobro excesivo</p>
        </div>
      </div>

      <main className="contenedor-panel">
        <section className="kpi-grid">
          {KPIS.map((k) => (
            <div key={k.clave} className={`kpi-card ${k.clase}`}>
              <div className="kpi-icono"><i className={`fa-solid ${k.icono}`}></i></div>
              <div className="kpi-info">
                <span className="kpi-titulo">{k.titulo}</span>
                <h3 className="kpi-valor">{conteo[k.clave]}</h3>
              </div>
            </div>
          ))}
        </section>

        <div className="caja-panel">
          <div className="cabecera-panel">
            <div className="titulo-seccion">
              <h2><i className="fa-solid fa-list-check"></i> Registro General de Reclamos</h2>
              <p>Gestiona y resuelve las solicitudes ingresadas por los usuarios en tiempo real.</p>
            </div>
            <button className="btn-nuevo-reclamo" onClick={() => setCrearAbierto(true)}>
              <i className="fa-solid fa-plus-circle"></i> Nuevo Reclamo
            </button>
          </div>

          <div className="barra-busqueda">
            <div className="input-buscar-container">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="input-buscar" placeholder="Buscar por Código, DNI, Cliente o Suministro..."
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className="badge-total">{filtrados.length} Reclamos</div>
          </div>

          <div className="contenedor-tabla">
            <table className="tabla-gestion" id="tabla-solicitudes">
              <thead>
                <tr>
                  <th style={{ width: "11%" }}>Código</th>
                  <th style={{ width: "9%" }}>Fecha</th>
                  <th style={{ width: "17%" }}>Cliente</th>
                  <th style={{ width: "9%" }}>DNI</th>
                  <th style={{ width: "10%" }}>Suministro</th>
                  <th style={{ width: "12%" }}>Contraste</th>
                  <th style={{ width: "11%" }}>Estado</th>
                  <th style={{ width: "21%", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estadoCarga === "cargando" && (
                  <tr><td colSpan={8} className="texto-cargando"><i className="fa-solid fa-spinner fa-spin"></i> Cargando base de datos...</td></tr>
                )}
                {estadoCarga === "error" && (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: "#dc2626", padding: 20 }}>Error al conectar con la base de datos Neon.</td></tr>
                )}
                {estadoCarga === "ok" && filtrados.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>No se encontraron reclamos registrados.</td></tr>
                )}
                {estadoCarga === "ok" && filtrados.map((r) => {
                  const clase = claseEstado(r.estado);
                  const pago = r.estado_pago || "pendiente";
                  const canal = pago === "pagado" && r.canal_pago ? ` · ${r.canal_pago === "caja" ? "Caja" : "Web"}` : "";
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.codigo_seguimiento || "N/A"}</strong></td>
                      <td>{formatearFecha(r.created_at || r.fecha_registro)}</td>
                      <td>{r.nombre_cliente || "Sin Nombre"}</td>
                      <td>{r.dni || "N/A"}</td>
                      <td>{r.numero_suministro || "N/A"}</td>
                      <td>
                        <div className="celda-pago">
                          {requiereContraste(r.motivo) && <span className="monto">{formatearSoles(Number(r.monto_calculado || 0))}</span>}
                          <span className={`badge-pago ${pago}`}>{(NOMBRES_PAGO[pago] || pago) + canal}</span>
                        </div>
                      </td>
                      <td><span className={`badge-tabla ${clase}`}>{clase.replace("_", " ").toUpperCase()}</span></td>
                      <td className="acciones-td">
                        <button className="btn-gestionar" onClick={() => abrirAtencion(r)}>
                          <i className="fa-solid fa-headset"></i> Atender / Gestionar
                        </button>
                        <button className="btn-eliminar" title="Eliminar Registro" onClick={() => eliminar(r.id)}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL ATENCIÓN Y DICTAMEN */}
      <div id="modal-atencion" className={`modal-overlay ${atencion ? "activo" : ""}`}>
        {atencion && (
          <div className="modal-card modal-lg">
            <div className="modal-header">
              <h3><i className="fa-solid fa-headset"></i> Centro de Atención y Dictamen de Reclamo</h3>
              <button type="button" className="btn-cerrar-x" onClick={() => setAtencion(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detalle-grid">
                <div className="detalle-item"><span className="label">Código de Reclamo:</span><strong className="val-codigo">{atencion.codigo_seguimiento || "N/A"}</strong></div>
                <div className="detalle-item"><span className="label">Fecha de Registro:</span><span className="val-texto">{formatearFecha(atencion.created_at || atencion.fecha_registro)}</span></div>
                <div className="detalle-item"><span className="label">Cliente:</span><span className="val-texto">{atencion.nombre_cliente || "N/A"}</span></div>
                <div className="detalle-item"><span className="label">DNI / RUC:</span><span className="val-texto">{atencion.dni || "N/A"}</span></div>
                <div className="detalle-item"><span className="label">N° Suministro:</span><span className="val-texto">{atencion.numero_suministro || "N/A"}</span></div>
                <div className="detalle-item">
                  <span className="label">Estado Actual:</span>
                  <span className="badge-estado" style={{ backgroundColor: COLORES_ESTADO[claseAtencion], color: "#ffffff" }}>
                    {claseAtencion.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <div className="detalle-item">
                  <span className="label">Derecho de contraste:</span>
                  <span className="val-texto">{requiereContraste(atencion.motivo) ? formatearSoles(Number(atencion.monto_calculado || 0)) : "No aplica"}</span>
                </div>
                <div className="detalle-item">
                  <span className="label">Estado de pago:</span>
                  <span className="val-texto">{NOMBRES_PAGO[atencion.estado_pago || "pendiente"] || atencion.estado_pago}</span>
                </div>
                <div className="detalle-item full-width">
                  <span className="label">Fundamento / Sustento del Cliente:</span>
                  <div className="caja-comentario">{atencion.comentario || "Sin observaciones."}</div>
                </div>
              </div>

              <hr className="divisor-modal" />

              <div className="campo-grupo">
                <label htmlFor="respuesta-admin"><i className="fa-solid fa-pen-to-square"></i> Respuesta u Observación de la Empresa:</label>
                <textarea id="respuesta-admin" rows={3} placeholder="Escriba la solución, ajuste de facturación o motivo de rechazo..."
                  value={respuesta} onChange={(e) => setRespuesta(e.target.value)}></textarea>
              </div>

              <div className="modal-footer-acciones">
                <span className="label-dictamen">Dictaminar Estado:</span>
                <div className="grupo-botones-dictamen">
                  <button type="button" className="btn-accion-proceso" onClick={() => dictaminar("en_proceso", "El reclamo ahora está EN PROCESO.")}>
                    <i className="fa-solid fa-spinner"></i> En Proceso
                  </button>
                  <button type="button" className="btn-accion-rechazar" onClick={() => dictaminar("rechazado", "El reclamo ha sido RECHAZADO.")}>
                    <i className="fa-solid fa-circle-xmark"></i> Rechazar
                  </button>
                  <button type="button" className="btn-accion-atender" onClick={() => dictaminar("atendido", "¡Reclamo marcado como ATENDIDO con éxito!")}>
                    <i className="fa-solid fa-circle-check"></i> Atender
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CREAR RECLAMO */}
      <div id="modal-crear" className={`modal-overlay ${crearAbierto ? "activo" : ""}`}>
        <div className="modal-card">
          <div className="modal-header">
            <h3><i className="fa-solid fa-square-plus"></i> Registrar Nuevo Reclamo</h3>
            <button type="button" className="btn-cerrar-x" onClick={cerrarCrear}>&times;</button>
          </div>

          <form id="form-crear-admin" className="modal-body" onSubmit={guardarNuevo}>
            <div className="campo-grupo">
              <label htmlFor="crear-dni"><i className="fa-solid fa-id-card"></i> DNI del Cliente (8 dígitos) *</label>
              <input type="text" id="crear-dni" placeholder="Ej. 73849102" minLength={8} maxLength={8} pattern="[0-9]{8}" inputMode="numeric" required
                value={crear.dni} onChange={(e) => cambiarCrear("dni", soloDigitos(e.target.value, 8))} />
            </div>

            <div className="campo-grupo">
              <label htmlFor="crear-nombre"><i className="fa-solid fa-user"></i> Nombre Completo *</label>
              <input type="text" id="crear-nombre" placeholder="Ej. Richard Luis Aguirre" required
                value={crear.nombre} onChange={(e) => cambiarCrear("nombre", e.target.value)} />
            </div>

            <div className="campo-grupo">
              <label htmlFor="crear-suministro"><i className="fa-solid fa-bolt"></i> N° Suministro (6 a 8 dígitos) *</label>
              <input type="text" id="crear-suministro" placeholder="Ej. 293819" minLength={6} maxLength={8} pattern="[0-9]{6,8}" inputMode="numeric" required
                value={crear.suministro} onChange={(e) => cambiarCrear("suministro", soloDigitos(e.target.value, 8))} />
            </div>

            <div className="grid-tarifa">
              <div className="campo-grupo">
                <label htmlFor="crear-tipo-medidor"><i className="fa-solid fa-gauge-high"></i> Tipo de medidor *</label>
                <select id="crear-tipo-medidor" value={crear.tipoMedidor} onChange={(e) => cambiarCrear("tipoMedidor", e.target.value)}>
                  <option value="monofasico">Monofásico (S/ 35.00)</option>
                  <option value="trifasico">Trifásico (S/ 75.00)</option>
                </select>
              </div>
              <div className="campo-grupo">
                <label htmlFor="crear-km"><i className="fa-solid fa-road"></i> Km fuera de zona urbana *</label>
                <input type="number" id="crear-km" min="0" max="999" step="0.1" inputMode="decimal" required
                  value={crear.km} onChange={(e) => cambiarCrear("km", e.target.value)} />
              </div>
            </div>
            <p className="monto-crear">Derecho de contraste a cobrar en caja: <output id="crear-monto" aria-live="polite">{formatearSoles(montoCrear)}</output></p>

            <div className="campo-grupo">
              <label htmlFor="crear-comentario"><i className="fa-solid fa-comment-dots"></i> Fundamento del Cobro Excesivo *</label>
              <textarea id="crear-comentario" rows={3} required placeholder="Describa el detalle o inconsistencia en la facturación..."
                value={crear.comentario} onChange={(e) => cambiarCrear("comentario", e.target.value)}></textarea>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-modal-cancelar" onClick={cerrarCrear}>Cancelar</button>
              <button type="submit" className="btn-modal-guardar"><i className="fa-solid fa-floppy-disk"></i> Guardar Registro</button>
            </div>
          </form>
        </div>
      </div>

      <footer>
        <p>&copy; 2026 LuzCentro Perú S.A. - Sistema de Gestión de Solicitudes y Reclamos</p>
      </footer>
    </div>
  );
}
