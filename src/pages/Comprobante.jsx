import { Fragment, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerComprobante } from "../api/pagos.api";
import { formatearSoles } from "../utils/tarifario";
import { rutaInicioSegunRol } from "../utils/sesion";
import "../styles/comprobante.css";

const NOMBRES_METODO = {
  tarjeta_debito: "Tarjeta de débito", tarjeta_credito: "Tarjeta de crédito",
  billetera: "Billetera electrónica", efectivo: "Efectivo", pos: "Tarjeta en POS",
};

export default function Comprobante() {
  const { usuario } = useAuth();
  const [params] = useSearchParams();
  const op = params.get("op");
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noencontrado | error
  const [pago, setPago] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        // El backend ya verifica que un cliente solo vea sus propios comprobantes
        const datos = await obtenerComprobante(op);
        if (!activo) return;
        setPago(datos);
        setEstado("ok");
      } catch (error) {
        if (!activo) return;
        if (error.response?.status === 404 || !op) setEstado("noencontrado");
        else { console.error(error); setEstado("error"); }
      }
    })();
    return () => { activo = false; };
  }, [op, usuario.id, usuario.rol]);

  // "Volver" depende del perfil: el cliente a sus registros; el personal a su módulo
  const volver = usuario.rol === "cliente" ? "/actualizar" : rutaInicioSegunRol(usuario.rol);

  const datos = pago && [
    ["N.° de operación", pago.codigo_operacion],
    ["Solicitud", pago.codigo_seguimiento],
    ["Cliente", pago.cliente ?? "Atención presencial"],
    ["Concepto", "Derecho de prueba de contraste de medidor"],
    ["Tipo de medidor", pago.tipo_medidor === "trifasico" ? "Trifásico" : "Monofásico"],
    ["Km fuera de zona urbana", String(Number(pago.km_fuera_zona ?? 0))],
    ["Canal", pago.canal === "pasarela" ? "Pago en línea" : "Ventanilla"],
    ["Medio", `${NOMBRES_METODO[pago.metodo]} ${pago.marca_tarjeta ?? pago.proveedor_billetera ?? ""} ${pago.referencia ?? ""}`.trim()],
    ["Importe", formatearSoles(Number(pago.monto))],
    ...(pago.metodo === "efectivo"
      ? [["Recibido", formatearSoles(Number(pago.monto_recibido))], ["Vuelto", formatearSoles(Number(pago.vuelto))]]
      : []),
    ...(pago.cajero ? [["Atendido por", pago.cajero]] : []),
    ["Fecha y hora", new Date(pago.fecha_pago).toLocaleString("es-PE", { timeZone: "America/Lima" })],
  ];

  return (
    <div className="pg-comprobante">
      <header>
        <div className="logo-container">
          <div className="logo-box"><i className="fa-solid fa-bolt"></i></div>
          <p className="logo-texto">LuzCentro Perú</p>
        </div>
        <nav aria-label="Navegación"><Link to="/">Inicio</Link></nav>
      </header>

      <main>
        <h1>Constancia de pago</h1>
        <section id="comprobante" aria-live="polite">
          {estado === "cargando" && "Cargando comprobante..."}
          {estado === "noencontrado" && "Comprobante no encontrado."}
          {estado === "error" && "No se pudo cargar el comprobante. Intenta nuevamente."}
          {estado === "ok" && (
            <>
              <p className="sello">PAGO APROBADO</p>
              <dl>
                {datos.map(([etiqueta, valor]) => (
                  <Fragment key={etiqueta}>
                    <dt>{etiqueta}</dt>
                    <dd>{valor ?? "—"}</dd>
                  </Fragment>
                ))}
              </dl>
            </>
          )}
        </section>
        <div className="acciones">
          <button type="button" id="imprimir" onClick={() => window.print()}><i className="fa-solid fa-print"></i> Imprimir</button>
          <Link to={volver} id="volver"><i className="fa-solid fa-arrow-left"></i> Volver</Link>
        </div>
      </main>
    </div>
  );
}
