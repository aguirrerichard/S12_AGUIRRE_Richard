import { useState } from "react";
import { Link } from "react-router-dom";
import { consultarRecibos } from "../api/facturacion.api";
import "../styles/recibos.css";

export default function Recibos() {
  const [suministro, setSuministro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { color, icono, texto }
  const [recibo, setRecibo] = useState(null);

  async function consultar() {
    const valor = suministro.trim();
    setRecibo(null);

    if (valor.length < 6) {
      return setMensaje({ color: "#ef4444", icono: "fa-circle-exclamation", texto: "Ingresa un número de suministro válido (mínimo 6 dígitos)." });
    }

    setBuscando(true);
    setMensaje(null);
    try {
      const consulta = await consultarRecibos(valor);
      const pendiente = consulta.find((r) => r.estado === "pendiente");
      if (pendiente) setRecibo(pendiente);
      else setMensaje({ color: "#10b981", icono: "fa-circle-check", texto: "El suministro es válido y se encuentra al día. No hay recibos pendientes." });
    } catch (error) {
      if (error.response?.status === 404) {
        setMensaje({ color: "#ef4444", icono: "fa-circle-xmark", texto: "El número de suministro ingresado no existe en nuestros registros." });
        return;
      }
      console.error("Error al consultar recibos:", error);
      setMensaje({ color: "#ef4444", icono: "fa-circle-exclamation", texto: "Error al conectar con el servidor." });
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="pg-recibos">
      <header>
        <div className="logo-container" style={{ display: "flex", alignItems: "center" }}>
          <div className="logo-box" style={{ fontSize: "1.5rem" }}><i className="fa-solid fa-bolt"></i></div>
          <h1 style={{ margin: "0 0 0 10px", fontSize: "1.4rem" }}>LuzCentro Perú</h1>
        </div>
        <nav>
          <ul style={{ display: "flex", gap: 25, listStyle: "none", margin: 0, padding: 0 }}>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/servicios"><i className="fa-solid fa-arrow-left"></i> Regresar a Servicios</Link></li>
          </ul>
        </nav>
      </header>

      <main className="contenedor-cuenta">
        <div className="caja-busqueda">
          <h2>Buscar Estado de Cuenta</h2>
          <p style={{ color: "#64748b" }}>Ingresa tu número de suministro (mínimo 6 dígitos).</p>
          <div className="barra-busqueda">
            <input type="text" id="input-suministro" placeholder="Ej: 123456" maxLength={10}
              value={suministro} onChange={(e) => setSuministro(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consultar()} />
            <button className="btn-buscar" id="btn-consultar" onClick={consultar} disabled={buscando}>
              {buscando ? "Buscando..." : "Consultar"}
            </button>
          </div>
          {mensaje && (
            <p style={{ marginTop: 15, fontWeight: "bold", fontSize: "0.9em", color: mensaje.color }}>
              <i className={`fa-solid ${mensaje.icono}`}></i> {mensaje.texto}
            </p>
          )}
        </div>

        {recibo && (
          <div className="resultado-simulado" style={{ display: "block" }}>
            <div className="cabecera-recibo">
              <h3>Detalle del Suministro: {recibo.numero_suministro}</h3>
              <span className="estado-pendiente">Pendiente de Pago</span>
            </div>
            <div className="cuerpo-recibo">
              <div className="datos-cliente">
                <p><strong>Titular:</strong> <span>{recibo.titular}</span></p>
                <p><strong>Mes de facturación:</strong> <span>{recibo.mes_facturacion}</span></p>
              </div>
              <div className="monto-deuda">
                <h4>Total a Pagar</h4>
                <h2>S/ {recibo.monto}</h2>
              </div>
            </div>
            <div className="acciones-recibo">
              <Link className="btn-accion btn-pagar"
                to={`/pago-recibo?suministro=${encodeURIComponent(recibo.numero_suministro)}&monto=${encodeURIComponent(recibo.monto)}`}>
                <i className="fa-regular fa-credit-card"></i> Pagar en línea
              </Link>
              <a href="#" className="btn-accion btn-descargar" onClick={(e) => { e.preventDefault(); window.print(); }}>
                <i className="fa-solid fa-download"></i> Descargar PDF
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
