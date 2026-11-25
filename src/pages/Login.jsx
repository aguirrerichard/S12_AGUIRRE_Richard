import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { rutaInicioSegunRol } from "../utils/sesion";
import { validarCorreo } from "../utils/validaciones";
import { mensajeDeError } from "../api/client";
import "../styles/login.css";

export default function Login() {
  const { login, registrar } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [modo, setModo] = useState("login");
  const [f, setF] = useState({ nombre: "", correo: "", pass: "" });
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const cambiar = (e) => setF({ ...f, [e.target.name]: e.target.value });

  function irDespues(usuario) {
    if (usuario.rol !== "cliente") return navigate(rutaInicioSegunRol(usuario.rol));
    navigate(params.get("redirect") || "/");
  }

  async function enviar(e) {
    e.preventDefault();
    setMensaje("");
    // Validaciones en el navegador: evitan peticiones inútiles al backend
    if (!validarCorreo(f.correo)) return setMensaje("Escribe un correo válido, por ejemplo nombre@correo.com.");
    if (f.pass.trim().length < 6) return setMensaje("La contraseña debe tener al menos 6 caracteres.");
    if (modo === "register" && f.nombre.trim().length < 3) return setMensaje("Escribe tu nombre completo.");
    setCargando(true);
    try {
      const u = modo === "login"
        ? await login(f.correo.trim(), f.pass.trim())
        : await registrar(f.nombre.trim(), f.correo.trim(), f.pass.trim());
      if (!u) setMensaje("Correo electrónico o contraseña incorrectos.");
      else irDespues(u);
    } catch (err) {
      console.error(err);
      setMensaje(err.response?.status === 409
        ? "Ese correo ya está registrado."
        : mensajeDeError(err, "No pudimos conectar con el servidor. Intenta de nuevo."));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="pg-login">
      <main>
        <section className="seccion-login">
          <h2>{modo === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</h2>
          <p>{modo === "login"
            ? "Accede con tu cuenta para registrar tus solicitudes"
            : "Regístrate como usuario en LuzCentro Perú"}</p>

          <form onSubmit={enviar}>
            {modo === "register" && (
              <div>
                <label htmlFor="nombre">Nombre Completo:</label>
                <input id="nombre" name="nombre" type="text" required value={f.nombre} onChange={cambiar} placeholder="Ej. Juan Pérez" />
              </div>
            )}
            <div>
              <label htmlFor="correo">Correo Electrónico:</label>
              <input id="correo" name="correo" type="email" required value={f.correo} onChange={cambiar} placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label htmlFor="pass">Contraseña:</label>
              <input id="pass" name="pass" type="password" required minLength={modo === "register" ? 6 : undefined}
                value={f.pass} onChange={cambiar} placeholder={modo === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"} />
            </div>
            {mensaje && <p style={{ color: "#ef4444" }}>{mensaje}</p>}
            <button type="submit" disabled={cargando}>{modo === "login" ? "Acceder" : "Crear Cuenta"}</button>
          </form>

          <div className="toggle-enlace">
            <p>
              {modo === "login" ? "¿Eres nuevo? " : "¿Ya tienes cuenta? "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMensaje(""); setModo(modo === "login" ? "register" : "login"); }}>
                {modo === "login" ? "Crear una cuenta" : "Iniciar sesión"}
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
