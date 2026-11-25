import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../styles/inicio.css";

const activo = ({ isActive }) => (isActive ? "activo" : "");

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { confirmar } = useToast();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const alHacerScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", alHacerScroll);
    return () => window.removeEventListener("scroll", alHacerScroll);
  }, []);

  const rol = usuario?.rol?.toLowerCase();
  const destino = rol === "cliente" ? "/actualizar" : rol === "cajero" ? "/caja" : "/panel";

  async function salir() {
    const si = await confirmar("Cerrar Sesión", "¿Deseas salir de tu cuenta actual?", "Sí, cerrar sesión", "Cancelar");
    if (si) {
      logout();
      navigate("/");
    }
  }

  return (
    <div className="pg-inicio">
      <header id="menu-principal" className={scrolled ? "scrolled" : ""}>
        <div className="logo-container">
          <div className="logo-box"><i className="fa-solid fa-bolt"></i></div>
          <h1>LuzCentro Perú</h1>
        </div>
        <nav>
          <ul>
            <li><NavLink to="/" end className={activo}>Inicio</NavLink></li>
            <li><NavLink to="/servicios" className={activo}>Servicios y Trámites</NavLink></li>
            <li><NavLink to="/requisitos" className={activo}>Requisitos</NavLink></li>
            <li><NavLink to="/formulario" className={activo}>Formularios</NavLink></li>
            <li><NavLink to="/contacto" className={activo}><i className="fa-solid fa-headset"></i> Contacto</NavLink></li>
            {usuario ? (
              <li>
                <div className="usuario-header-box">
                  <Link to={destino} className="usuario-header-link">
                    <i className="fa-solid fa-user-circle"></i>
                    <span>{usuario.nombre || "Mi Cuenta"}</span>
                  </Link>
                  <button className="btn-cerrar-header" onClick={salir}>
                    <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                  </button>
                </div>
              </li>
            ) : (
              <>
                <li><Link to="/login"><i className="fa-solid fa-user"></i> Iniciar Sesión</Link></li>
                <li><Link to="/login" className="btn-nav">Crear Cuenta</Link></li>
              </>
            )}
          </ul>
        </nav>
      </header>

      <Outlet />

      <footer>
        <div className="footer-grid">
          <div className="footer-columna">
            <div className="logo-box" style={{ display: "inline-block", marginBottom: 15 }}>
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h3>LuzCentro Perú</h3>
            <p>Comprometidos con el desarrollo energético y social del centro del país, brindando energía de calidad.</p>
          </div>
          <div className="footer-columna">
            <h3>Atención al Cliente</h3>
            <ul>
              <li><i className="fa-solid fa-phone"></i> (064) 200-000</li>
              <li><i className="fa-solid fa-envelope"></i> consultas@luzcentro.pe</li>
              <li><i className="fa-solid fa-location-dot"></i> Av. Huancavelica 123, Huancayo</li>
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <p>&copy; 2026 LuzCentro Perú. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
