import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { pagarRecibo } from "../api/facturacion.api";
import { mensajeDeError } from "../api/client";
import "../styles/pagorecibo.css";

export default function PagoRecibo() {
  const { notificar } = useToast();
  const [params] = useSearchParams();
  const suministro = params.get("suministro") || "12345678";
  const monto = parseFloat(params.get("monto")) || 124.5;

  const [nombre, setNombre] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [fecha, setFecha] = useState("");
  const [cvv, setCvv] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState(null); // { nombre, tarjeta }

  // Formato visual de los campos
  const formatearTarjeta = (v) => v.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
  const formatearFecha = (v) => {
    const d = v.replace(/\D/g, "");
    return d.length > 2 ? d.substring(0, 2) + "/" + d.substring(2, 4) : d;
  };

  async function pagar(e) {
    e.preventDefault();
    const numCompleto = tarjeta.replace(/\s/g, "");
    if (numCompleto.length < 16) {
      return notificar("Por favor, ingresa los 16 dígitos de la tarjeta.", "advertencia");
    }
    const enmascarada = `**** **** **** ${numCompleto.slice(-4)}`;

    setProcesando(true);
    try {
      // Solo viajan el titular y los últimos 4 dígitos; el monto lo toma el backend de la BD
      await pagarRecibo(suministro, { titular: nombre.trim(), ultimos4: numCompleto.slice(-4) });
      setExito({ nombre: nombre.trim(), tarjeta: enmascarada });
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      notificar(mensajeDeError(error, "Lo sentimos, hubo un error de conexión al procesar el pago. Inténtalo de nuevo."), "error", 6000);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="pg-pagorecibo">
      <div className="contenedor-pago">
        <div className="tarjeta-pago">
          <div className="cabecera-pago">
            <h2><i className="fa-solid fa-shield-halved"></i> Pasarela Segura</h2>
            {!exito && <Link to="/servicios" className="btn-cancelar">Cancelar</Link>}
          </div>

          {!exito ? (
            <div id="seccion-formulario">
              <div className="resumen-compra">
                <p>Pago de Recibo - Suministro <span>{suministro}</span></p>
                <h2>S/ {monto.toFixed(2)}</h2>
              </div>

              <form onSubmit={pagar}>
                <div className="grupo-input">
                  <label>Nombre en la tarjeta</label>
                  <input type="text" placeholder="EJ. JUAN PEREZ" required autoComplete="off" value={nombre}
                    onChange={(e) => setNombre(e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, ""))} />
                </div>

                <div className="grupo-input">
                  <label>Número de Tarjeta</label>
                  <div className="input-icono">
                    <i className="fa-brands fa-cc-visa" id="icono-tarjeta"></i>
                    <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} required autoComplete="off"
                      value={tarjeta} onChange={(e) => setTarjeta(formatearTarjeta(e.target.value))} />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="grupo-input">
                    <label>Vencimiento (MM/AA)</label>
                    <input type="text" placeholder="12/28" maxLength={5} required autoComplete="off"
                      value={fecha} onChange={(e) => setFecha(formatearFecha(e.target.value))} />
                  </div>
                  <div className="grupo-input">
                    <label>CVV</label>
                    <input type="password" placeholder="***" maxLength={3} required autoComplete="off"
                      value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))} />
                  </div>
                </div>

                <button type="submit" className="btn-pagar-final" disabled={procesando}>
                  {procesando
                    ? <>Procesando pago... <i className="fa-solid fa-circle-notch fa-spin"></i></>
                    : <>Procesar Pago Seguro <i className="fa-solid fa-lock"></i></>}
                </button>
              </form>

              <div className="logos-tarjetas">
                <i className="fa-brands fa-cc-visa"></i>
                <i className="fa-brands fa-cc-mastercard"></i>
                <i className="fa-brands fa-cc-amex"></i>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: "5rem", color: "#10b981", marginBottom: 20 }}></i>
              <h2 style={{ color: "#0a2540", marginBottom: 10 }}>¡Pago Exitoso!</h2>
              <p style={{ color: "#64748b", marginBottom: 25 }}>Tu pago se ha registrado correctamente y tu recibo ha sido cancelado.</p>
              <div style={{ background: "#f1f5f9", padding: 15, borderRadius: 8, marginBottom: 25, textAlign: "left", fontSize: "0.9em", color: "#475569" }}>
                <strong>Titular:</strong> <span>{exito.nombre}</span><br />
                <strong>Tarjeta:</strong> <span>{exito.tarjeta}</span><br />
                <strong>Monto pagado:</strong> <span>S/ {monto.toFixed(2)}</span>
              </div>
              <Link to="/servicios" className="btn-pagar-final" style={{ display: "inline-block", textDecoration: "none" }}>Volver a Servicios</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
