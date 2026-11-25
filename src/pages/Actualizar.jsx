import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useMisReclamos } from "../hooks/useMisReclamos";
import { actualizarReclamo } from "../api/reclamos.api";
import { formatearSoles, requiereContraste } from "../utils/tarifario";
import "../styles/actualizar.css";

const NOMBRES_PAGO = { pendiente: "Pendiente", pagado: "Pagado", exonerado: "Exonerado" };
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export default function Actualizar() {
  const { usuario } = useAuth();
  const { notificar } = useToast();
  const { reclamos, estado, recargar } = useMisReclamos();
  const [edicion, setEdicion] = useState(null);     // { reclamo, comentario, tipoMedidor, km, mensaje }
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setReclamos(await listarMisReclamos(usuario.id));
      setEstado("ok");
    } catch (error) {
      console.error("Error al obtener reclamos propios:", error);
      setEstado("error");
    }
  }, [usuario.id]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirEdicion(r) {
    setEdicion({
      reclamo: r,
      comentario: r.comentario || "",
      tipoMedidor: r.tipo_medidor || "monofasico",
      km: String(Number(r.km_fuera_zona ?? 0)),
      mensaje: "",
    });
  }

  const cambiar = (campo, valor) => setEdicion((e) => ({ ...e, [campo]: valor }));

  async function guardar() {
    const comentario = edicion.comentario.trim();
    const conContraste = requiereContraste(edicion.reclamo.motivo);
    if (!comentario) return cambiar("mensaje", "La descripción / fundamento es obligatoria.");
    if (conContraste && edicion.km !== "" && !(Number(edicion.km) >= 0)) {
      return cambiar("mensaje", "Los km fuera de la zona urbana deben ser 0 o más.");
    }
    setGuardando(true);
    try {
      // Una solicitud ya pagada o en atención no se edita: el backend responde 409
      await actualizarReclamo(edicion.reclamo.id, {
        comentario,
        tipo_medidor: edicion.tipoMedidor,
        km_fuera_zona: Math.max(0, Number(edicion.km) || 0),
      });
      setEdicion(null);
      notificar("Registro actualizado correctamente.", "exito");
      await recargar();
    } catch (error) {
      console.error("Error al actualizar reclamo:", error);
      cambiar("mensaje", error.response?.status === 409
        ? "No se pudo actualizar: el trámite ya fue pagado o está en atención."
        : "No se pudo actualizar el registro.");
    } finally {
      setGuardando(false);
    }
  }

  const filaMensaje = (texto, color = "#64748b") => (
    <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color }}>{texto}</td></tr>
  );

  const conContrasteEdicion = edicion && requiereContraste(edicion.reclamo.motivo);

  return (
    <div className="pg-actualizar">
      <div className="banner-interno">
        <div className="contenido-banner">
          <h1>Mis Reclamos y Gestiones</h1>
          <p>Consulta el estado de tus trámites y actualiza tus fundamentos rápidamente.</p>
        </div>
      </div>

      <main className="contenedor-panel">
        <div className="caja-panel">
          <div className="cabecera-panel">
            <h2><i className="fa-solid fa-file-invoice-dollar"></i> Registros Propios</h2>
            <p>Aquí puedes visualizar el progreso de tus solicitudes. Recuerda que solo puedes editar la descripción de un reclamo si este aún se encuentra en estado <strong>Registrado</strong>.</p>
          </div>

          <div className="contenedor-tabla">
            <table className="tabla-gestion">
              <thead>
                <tr>
                  <th>Código</th><th>Suministro</th><th>Motivo</th><th>Descripción / Fundamento</th>
                  <th>Estado</th><th>Contraste (S/)</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody id="tbody-mis-reclamos">
                {estado === "cargando" && filaMensaje("Cargando tus registros...")}
                {estado === "error" && filaMensaje("Error al conectar con la base de datos.", "red")}
                {estado === "ok" && reclamos.length === 0 && filaMensaje("No tienes registros de reclamos almacenados actualmente.")}
                {estado === "ok" && reclamos.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.codigo_seguimiento || "N/A"}</strong></td>
                    <td>{r.numero_suministro || "N/A"}</td>
                    <td>{r.motivo || "Reclamo por Monto Excesivo"}</td>
                    <td>{r.comentario || ""}</td>
                    <td>
                      <span className={`badge badge-${r.estado}`}>{capitalizar((r.estado || "registrado").replace("_", " "))}</span>
                    </td>
                    <td>
                      <div className="celda-pago">
                        {requiereContraste(r.motivo) && <span className="monto">{formatearSoles(Number(r.monto_calculado))}</span>}
                        <span className={`badge-pago ${r.estado_pago}`}>{NOMBRES_PAGO[r.estado_pago] ?? r.estado_pago}</span>
                      </div>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        {r.estado_pago === "pendiente" && (
                          <Link className="btn-accion btn-pagar" to={`/pago?id=${encodeURIComponent(r.id)}`}>Pagar</Link>
                        )}
                        {r.estado_pago === "pagado" && r.codigo_operacion && (
                          <Link className="btn-accion" to={`/comprobante?op=${encodeURIComponent(r.codigo_operacion)}`}>Ver comprobante</Link>
                        )}
                        {r.estado === "registrado" && r.estado_pago !== "pagado" && (
                          <button type="button" className="btn-accion btn-editar" onClick={() => abrirEdicion(r)}>Editar</button>
                        )}
                        {r.estado !== "registrado" && (
                          <span className="estado-bloqueado">Trámite {capitalizar((r.estado || "").replace("_", " "))}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div id="modal-editar-cliente" className={`modal-overlay ${edicion ? "activo" : ""}`}>
        <div className="modal-caja">
          <div className="modal-icono"><i className="fa-solid fa-pen-to-square"></i></div>
          <h3>Actualizar Reclamo</h3>
          <p>Modifica el detalle o fundamento de tu reclamo antes de que sea procesado.</p>

          {edicion && (
            <>
              <div className="grupo-input">
                <textarea id="edit-comentario" rows={5} required placeholder=" " value={edicion.comentario}
                  onChange={(e) => cambiar("comentario", e.target.value)}></textarea>
                <label htmlFor="edit-comentario">Descripción / Fundamento detallado</label>
              </div>

              {conContrasteEdicion && (
                <div id="edit-contraste" className="bloque-contraste">
                  <div className="campo-estatico">
                    <label htmlFor="edit-tipo-medidor">Tipo de medidor</label>
                    <select id="edit-tipo-medidor" value={edicion.tipoMedidor} onChange={(e) => cambiar("tipoMedidor", e.target.value)}>
                      <option value="monofasico">Monofásico</option>
                      <option value="trifasico">Trifásico</option>
                    </select>
                  </div>
                  <div className="campo-estatico">
                    <label htmlFor="edit-km">Km fuera de la zona urbana</label>
                    <input type="number" id="edit-km" min="0" max="999" step="0.1" inputMode="decimal"
                      value={edicion.km} onChange={(e) => cambiar("km", e.target.value)} />
                  </div>
                  <p className="monto-edicion">
                    Monto estimado: <output id="edit-monto" aria-live="polite">
                      {formatearSoles(calcularMontoServicio({ tipo_medidor: edicion.tipoMedidor, km_fuera_zona: edicion.km }))}
                    </output>
                  </p>
                </div>
              )}

              <p id="edit-mensaje" className="mensaje-modal" role="alert">{edicion.mensaje}</p>
            </>
          )}

          <div className="modal-botones">
            <button type="button" className="btn-modal-cancelar" onClick={() => setEdicion(null)}>Cancelar</button>
            <button type="button" className="btn-modal-guardar" onClick={guardar} disabled={guardando}>Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}
