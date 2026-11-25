import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { crearCambioTitular } from "../api/reclamos.api";
import { mensajeDeError } from "../api/client";
import "../styles/tramites.css";

export default function Tramites() {
  const { notificar } = useToast();
  const [params] = useSearchParams();
  const [suministro, setSuministro] = useState(params.get("suministro") ?? "");
  const [nombres, setNombres] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    const sum = suministro.trim();
    const nom = nombres.trim();

    if (!sum || !nom) return notificar("Por favor, completa todos los campos.", "advertencia");
    if (sum.length < 6) return notificar("El número de suministro debe tener al menos 6 dígitos.", "advertencia");

    if (!/^\d+$/.test(sum)) return notificar("El número de suministro solo debe tener dígitos.", "advertencia");

    setEnviando(true);
    setCodigo(null);
    try {
      const { codigo: nuevoCodigo } = await crearCambioTitular({ suministro: sum, nombre: nom });
      setCodigo(nuevoCodigo);
      setSuministro("");
      setNombres("");
    } catch (error) {
      console.error("Error al guardar el trámite:", error);
      notificar(mensajeDeError(error, "Hubo un error al registrar el trámite."), "error", 6000);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pg-tramites">
      <main className="contenedor-formulario">
        <div className="caja-formulario">
          <form id="form-cambio-titular" onSubmit={enviar}>
            <h2 style={{ textAlign: "center", color: "var(--primario)", marginBottom: 25 }}>Cambio de Titular</h2>

            <h3>Paso 1: Datos del Suministro</h3>
            <div className="grupo-input">
              <label htmlFor="suministro">N° de Suministro Actual *</label>
              <input type="text" id="suministro" required placeholder="Ej: 123456" maxLength={10}
                value={suministro} onChange={(e) => setSuministro(e.target.value)} />
            </div>

            <h3>Paso 2: Datos del Nuevo Titular</h3>
            <div className="grupo-input">
              <label htmlFor="nombres">Nombres Completos *</label>
              <input type="text" id="nombres" required placeholder="Ingresa tus nombres y apellidos"
                value={nombres} onChange={(e) => setNombres(e.target.value)} />
            </div>

            <button type="submit" id="btn-enviar" className="btn-enviar" disabled={enviando}>
              {enviando ? <>Guardando... <i className="fa-solid fa-circle-notch fa-spin"></i></> : "Procesar Solicitud"}
            </button>

            {codigo && (
              <div style={{ marginTop: 15 }}>
                <div style={{ background: "#d1fae5", color: "#065f46", border: "2px solid #10b981", padding: 15, borderRadius: 8, textAlign: "center" }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: "1.8rem", marginBottom: 8 }}></i><br />
                  <strong>¡Solicitud Registrada!</strong><br />
                  Tu código de seguimiento es: <br />
                  <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#047857" }}>{codigo}</span>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
