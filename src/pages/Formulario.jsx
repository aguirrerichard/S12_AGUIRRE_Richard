import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { crearReclamo } from "../api/reclamos.api";
import { mensajeDeError } from "../api/client";
import { calcularMontoServicio, formatearSoles, requiereContraste } from "../utils/tarifario";
import "../styles/formulario.css";

const numeroAleatorio = () => Math.floor(10000000 + Math.random() * 90000000).toString();

// Textos y campos que cambian según el tipo de trámite
const TRAMITES = {
  "Nuevo Suministro": {
    lblDni: "DNI del Titular *",
    lblSuministro: "N° Suministro (Autogenerado o escribe el tuyo) *",
    lblDescripcion: "Referencias para llegar al domicilio *",
    direccion: true,
    ayuda: (<><strong>Documentos requeridos:</strong> <br />1. Copia del DNI del titular. <br />2. Documento de propiedad. <br />3. Croquis de ubicación simple.</>),
  },
  "Cambio de Titular": {
    lblDni: "DNI del Nuevo Titular *",
    lblSuministro: "N° Suministro Actual *",
    lblDescripcion: "Motivo de cambio (Ej. Compra, alquiler) *",
    ayuda: (<><strong>Documentos requeridos:</strong> <br />1. Copia del DNI del nuevo titular. <br />2. Copia literal o contrato.</>),
  },
  "Reclamo por Monto Excesivo": {
    lblDni: "DNI del Solicitante *",
    lblSuministro: "N° Suministro Actual *",
    lblDescripcion: "Fundamento del reclamo *",
    reclamo: true,
    ayuda: (<><strong>Opcional:</strong> Puedes adjuntar una foto de tu medidor actual mostrando la lectura.</>),
  },
  Otros: {
    lblDni: "DNI / RUC del Solicitante *",
    lblSuministro: "N° Suministro Actual *",
    lblDescripcion: "Descripción detallada *",
    ayuda: (<><strong>Opcional:</strong> Adjunta cualquier documento (PDF, JPG) que sustente tu petición.</>),
  },
};

export default function Formulario() {
  const { usuario } = useAuth();
  const { notificar } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Desde "Requisitos" llega ?tipo=nuevo o ?tipo=cambio
  const inicial = { nuevo: "Nuevo Suministro", cambio: "Cambio de Titular" }[params.get("tipo")] ?? "";

  const [tipo, setTipo] = useState(inicial);
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState(usuario?.nombre ?? "");
  const [suministro, setSuministro] = useState(inicial === "Nuevo Suministro" ? numeroAleatorio() : "");
  const [direccion, setDireccion] = useState("");
  const [mes, setMes] = useState("");
  const [montoReclamo, setMontoReclamo] = useState("");
  const [tipoMedidor, setTipoMedidor] = useState("monofasico");
  const [km, setKm] = useState("0");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cfg = TRAMITES[tipo];
  const aplicaCobro = requiereContraste(tipo);
  const montoEstimado = calcularMontoServicio({ tipo_medidor: tipoMedidor, km_fuera_zona: km });

  function cambiarTipo(e) {
    const nuevo = e.target.value;
    setTipo(nuevo);
    setSuministro(nuevo === "Nuevo Suministro" ? numeroAleatorio() : "");
  }

  async function enviar(e) {
    e.preventDefault();
    if (!dni.trim() || !nombres.trim() || !tipo || !descripcion.trim()) {
      return notificar("Por favor, completa los campos obligatorios.", "advertencia");
    }
    if (aplicaCobro && km !== "" && !(Number(km) >= 0)) {
      return notificar("Los kilómetros fuera de la zona urbana deben ser un número mayor o igual a 0.", "advertencia");
    }

    // El monto lo calcula el backend; aquí solo se envían los datos que escribió el cliente
    const medidor = aplicaCobro ? tipoMedidor : "monofasico";
    const kmFuera = aplicaCobro ? Math.max(0, Number(km) || 0) : 0;

    setEnviando(true);
    try {
      const creado = await crearReclamo({
        dni: dni.trim() || null, nombre: nombres.trim(), motivo: tipo,
        suministro: suministro.trim() || null, direccion: direccion.trim() || null,
        mes: mes || null, montoReclamo: montoReclamo ? parseFloat(montoReclamo) : null,
        comentario: descripcion.trim(), tipo_medidor: medidor, km_fuera_zona: kmFuera,
      });

      if (creado.estado_pago === "pendiente") {
        notificar(`¡Trámite registrado! Código: ${creado.codigo}. Derecho de contraste: ${formatearSoles(Number(creado.monto_calculado))}. Te llevamos a la pasarela de pago.`, "exito", 5000);
        setTimeout(() => navigate(`/pago?id=${creado.id}`), 1500);
      } else {
        notificar(`¡Trámite registrado con éxito! Código de seguimiento: ${creado.codigo}. Este trámite no requiere pago de contraste.`, "exito", 5000);
        setTimeout(() => navigate("/actualizar"), 1500);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      notificar(mensajeDeError(error, "Hubo un error al registrar la información."), "error");
      setEnviando(false);
    }
  }

  return (
    <div className="pg-formulario">
      <div className="banner-interno" style={{ backgroundImage: "linear-gradient(rgba(10,37,64,0.85), rgba(10,37,64,0.85)), url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1920&q=80')" }}>
        <div className="contenido-banner">
          <h1>Mesa de Partes Virtual</h1>
          <p>Ingresa tus solicitudes técnicas y comerciales sin salir de casa</p>
        </div>
      </div>

      <main className="contenedor-formulario">
        <div className="caja-formulario">
          <div className="cabecera-form" id="cabecera-form">
            <h2>Ingreso de Solicitud</h2>
            <p>Por favor, selecciona tu trámite y completa los datos. Los campos con (*) son obligatorios.</p>
          </div>

          <form id="form-reclamo" onSubmit={enviar}>
            <div className="grupo-input">
              <select id="tipo_tramite" required value={tipo} onChange={cambiarTipo}>
                <option value="" disabled>Selecciona el tipo de trámite *</option>
                <option value="Nuevo Suministro">Nuevo Suministro</option>
                <option value="Cambio de Titular">Cambio de Titularidad</option>
                <option value="Reclamo por Monto Excesivo">Reclamo por Facturación (Monto Excesivo)</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            {cfg && (
              <div id="seccion-dinamica">
                <div className="grid-2-col">
                  <div className="grupo-input">
                    <input type="text" id="dni" required placeholder=" " value={dni} onChange={(e) => setDni(e.target.value)} />
                    <label htmlFor="dni" id="lbl-dni">{cfg.lblDni}</label>
                  </div>
                  <div className="grupo-input">
                    <input type="text" id="nombres" required placeholder=" " value={nombres} onChange={(e) => setNombres(e.target.value)} />
                    <label htmlFor="nombres">Nombres y Apellidos *</label>
                  </div>
                </div>

                <div className="grupo-input" id="div-suministro">
                  <input type="text" id="suministro" required placeholder=" " value={suministro} onChange={(e) => setSuministro(e.target.value)} />
                  <label htmlFor="suministro" id="lbl-suministro">{cfg.lblSuministro}</label>
                </div>

                {cfg.direccion && (
                  <div className="grupo-input" id="div-direccion">
                    <input type="text" id="direccion" required placeholder=" " value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                    <label htmlFor="direccion">Dirección exacta para instalación *</label>
                  </div>
                )}

                {cfg.reclamo && (
                  <div className="grid-2-col" id="div-datos-reclamo">
                    <div className="grupo-input">
                      <input type="month" id="mes_reclamo" required placeholder=" " value={mes} onChange={(e) => setMes(e.target.value)} />
                      <label htmlFor="mes_reclamo">Mes a reclamar *</label>
                    </div>
                    <div className="grupo-input">
                      <input type="number" step="0.01" id="monto_reclamo" required placeholder=" " value={montoReclamo} onChange={(e) => setMontoReclamo(e.target.value)} />
                      <label htmlFor="monto_reclamo">Monto a reclamar (S/) *</label>
                    </div>
                  </div>
                )}

                {aplicaCobro && (
                  <fieldset id="div-contraste">
                    <legend><i className="fa-solid fa-gauge-high"></i> Prueba de contraste de medidor</legend>
                    <p className="texto-ayuda">
                      Para derivar tu reclamo a inspección se cobra el derecho de contraste:{" "}
                      <strong>Monofásico S/ 35.00</strong> o <strong>Trifásico S/ 75.00</strong>,
                      más <strong>S/ 2.50 por km</strong> fuera de la zona urbana.
                    </p>
                    <div className="grid-2-col">
                      <div className="grupo-input grupo-estatico">
                        <label htmlFor="tipo_medidor">Tipo de medidor *</label>
                        <select id="tipo_medidor" name="tipo_medidor" value={tipoMedidor} onChange={(e) => setTipoMedidor(e.target.value)}>
                          <option value="monofasico">Monofásico</option>
                          <option value="trifasico">Trifásico</option>
                        </select>
                      </div>
                      <div className="grupo-input grupo-estatico">
                        <label htmlFor="km_fuera_zona">Km fuera de la zona urbana *</label>
                        <input type="number" id="km_fuera_zona" name="km_fuera_zona" min="0" max="999" step="0.1"
                          inputMode="decimal" required value={km} onChange={(e) => setKm(e.target.value)} />
                      </div>
                    </div>
                    <p className="monto-cotizado">
                      Monto estimado: <output id="monto-estimado" aria-live="polite">{formatearSoles(montoEstimado)}</output>
                    </p>
                  </fieldset>
                )}

                <div className="grupo-input">
                  <textarea id="descripcion" rows={4} required placeholder=" " value={descripcion} onChange={(e) => setDescripcion(e.target.value)}></textarea>
                  <label htmlFor="descripcion" id="lbl-descripcion">{cfg.lblDescripcion}</label>
                </div>

                <div className="grupo-archivo">
                  <label htmlFor="adjunto"><i className="fa-solid fa-paperclip"></i> Archivos Adjuntos (PDF, JPG)</label>
                  <input type="file" id="adjunto" accept=".pdf,.jpg,.png" multiple />
                  <span id="requisitos-adjunto" className="texto-ayuda">{cfg.ayuda}</span>
                </div>

                <button type="submit" id="btn-enviar-reclamo" className="btn-enviar" disabled={enviando}>
                  {enviando ? "Guardando..." : <>Registrar Solicitud <i className="fa-solid fa-file-export"></i></>}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
