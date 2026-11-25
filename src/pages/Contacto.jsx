import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { enviarMensaje } from "../api/contacto.api";
import { mensajeDeError } from "../api/client";
import { validarCorreo } from "../utils/validaciones";
import "../styles/contacto.css";

export default function Contacto() {
  const { usuario } = useAuth();
  const { notificar } = useToast();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [f, setF] = useState({ nombre: "", correo: "", suministro: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null); // nombre de quien envió

  const cambiar = (e) => setF({ ...f, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    if (!usuario?.id) {
      setModalAbierto(true);
      return;
    }
    if (!validarCorreo(f.correo)) {
      return notificar("Escribe un correo válido, por ejemplo nombre@correo.com.", "advertencia");
    }
    setEnviando(true);
    try {
      await enviarMensaje({
        nombre: f.nombre.trim(), correo: f.correo.trim(),
        suministro: f.suministro.trim() || null, mensaje: f.mensaje.trim(),
      });
      setEnviado(f.nombre.trim());
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
      notificar(mensajeDeError(error, "Hubo un error al intentar enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo."), "error", 6000);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pg-contacto">

    <div className="banner-interno" style={{ backgroundImage: "linear-gradient(rgba(10,37,64,0.85), rgba(10,37,64,0.85)), url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&q=80')" }}>
        <div className="contenido-banner">
            <h1>Centro de Atención</h1>
            <p>Estamos aquí para escucharte y resolver tus consultas 24/7</p>
        </div>
    </div>

      <section className="contenedor-contacto">
        <div className="grid-contacto">
            <div className="info-contacto">
                <h2>¿En qué podemos ayudarte?</h2>
                <p>Comunícate con nosotros a través de nuestros canales oficiales o visítanos en nuestra sede principal.</p>
                
                <div className="lista-contacto">
                    <div className="item-contacto">
                        <div className="icono-contacto"><i className="fa-solid fa-phone"></i></div>
                        <div>
                            <h4>Fonoluz Centro</h4>
                            <p>(064) 200-000</p>
                        </div>
                    </div>
                    <div className="item-contacto">
                        <div className="icono-contacto"><i className="fa-solid fa-envelope"></i></div>
                        <div>
                            <h4>Correo Electrónico</h4>
                            <p>consultas@luzcentro.pe</p>
                        </div>
                    </div>
                    <div className="item-contacto">
                        <div className="icono-contacto"><i className="fa-solid fa-location-dot"></i></div>
                        <div>
                            <h4>Sede Principal</h4>
                            <p>Av. Huancavelica 123, El Tambo<br />Huancayo, Junín, Perú</p>
                        </div>
                    </div>
                </div>
            </div>

          <div className="caja-formulario">
            <h3>Envíanos un mensaje</h3>

            {enviado === null ? (
              <form onSubmit={enviar}>
                <div className="grupo-input">
                  <input type="text" id="nombre" name="nombre" required placeholder=" " value={f.nombre} onChange={cambiar} />
                  <label htmlFor="nombre">Nombre Completo</label>
                </div>
                <div className="grupo-input">
                  <input type="email" id="correo" name="correo" required placeholder=" " value={f.correo} onChange={cambiar} />
                  <label htmlFor="correo">Correo Electrónico</label>
                </div>
                <div className="grupo-input">
                  <input type="text" id="suministro" name="suministro" placeholder=" " value={f.suministro} onChange={cambiar} />
                  <label htmlFor="suministro">N° Suministro (Opcional)</label>
                </div>
                <div className="grupo-input">
                  <textarea id="mensaje" name="mensaje" rows={4} required placeholder=" " value={f.mensaje} onChange={cambiar}></textarea>
                  <label htmlFor="mensaje">¿Cómo podemos ayudarte?</label>
                </div>
                <button type="submit" className="btn-enviar" disabled={enviando}>
                  {enviando ? (
                    <>Enviando... <i className="fa-solid fa-circle-notch fa-spin"></i></>
                  ) : (
                    <>Enviar Mensaje <i className="fa-solid fa-paper-plane"></i></>
                  )}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: "4rem", color: "#10b981", marginBottom: 20 }}></i>
                <h3 style={{ color: "#0a2540", marginBottom: 15 }}>¡Mensaje Enviado!</h3>
                <p style={{ color: "#64748b", marginBottom: 25 }}>
                  Gracias por contactarnos, <strong>{enviado}</strong>. Hemos recibido tu mensaje y te responderemos a la brevedad a tu correo electrónico.
                </p>
                <button
                  className="btn-enviar"
                  style={{ width: "auto", padding: "10px 30px", margin: "0 auto" }}
                  onClick={() => { setEnviado(null); setF({ nombre: "", correo: "", suministro: "", mensaje: "" }); }}
                >
                  Enviar otra consulta
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={`modal-overlay ${modalAbierto ? "activo" : ""}`}>
        <div className="modal-caja">
          <div className="modal-icono"><i className="fa-solid fa-shield-halved"></i></div>
          <h3>Inicio de Sesión Requerido</h3>
          <p>Para proteger tus datos y enviar tu mensaje, necesitas acceder a tu cuenta.</p>
          <div className="modal-botones">
            <button className="btn-modal-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <Link to="/login?redirect=/contacto" className="btn-modal-login">Iniciar Sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
