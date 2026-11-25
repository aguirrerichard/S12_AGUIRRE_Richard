import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TarjetaTramite from "../components/TarjetaTramite";
import "../styles/servicios.css";

const TRAMITES = [
  { icono: "fa-file-invoice-dollar", titulo: "Facturación y Pagos", ruta: "/recibos", boton: "Ver estado de cuenta",
    texto: "Consulta tu deuda actual, visualiza tu último recibo y realiza pagos seguros en línea." },
  { icono: "fa-user-pen", titulo: "Cambio de Titular", ruta: "/tramites", boton: "Iniciar solicitud",
    texto: "Actualiza los datos del recibo si eres el nuevo propietario o inquilino del inmueble." },
  { icono: "fa-plug-circle-plus", titulo: "Nuevo Suministro", ruta: "/requisitos", boton: "Ver requisitos",
    texto: "Solicita la instalación de un nuevo medidor verificando primero los requisitos técnicos." },
];

export default function Servicios() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [modalAbierto, setModalAbierto] = useState(false);

  // Si hay sesión va a la página; si no, muestra el aviso de "Inicio de sesión requerido"
  const ir = (ruta) => {
    if (usuario?.id) navigate(ruta);
    else setModalAbierto(true);
  };

  return (
    <div className="pg-servicios">
    
    <section className="banner-interno">
        <div className="contenido-banner">
            <h1>Oficina Virtual y Catálogo</h1>
            <p>Realiza tus operaciones comerciales y técnicas en línea con rapidez y seguridad.</p>
        </div>
    </section>
    <main className="contenedor-servicios">
        <div className="cabecera-seccion">
            <h2>Gestiones en Línea</h2>
            <p>Selecciona el tipo de trámite o consulta que deseas realizar.</p>
        </div>
        
        <div className="cuadricula-tramites">
          {TRAMITES.map((t) => (
            <TarjetaTramite key={t.titulo} {...t} onIr={() => ir(t.ruta)} />
          ))}
        </div>
    </main>

      <div className={`modal-overlay ${modalAbierto ? "activo" : ""}`}>
        <div className="modal-caja">
          <div className="modal-icono"><i className="fa-solid fa-shield-halved"></i></div>
          <h3>Inicio de Sesión Requerido</h3>
          <p>Para proteger tus datos y realizar este trámite, necesitas acceder a tu cuenta.</p>
          <div className="modal-botones">
            <button className="btn-modal-cancelar" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <Link to="/login?redirect=/servicios" className="btn-modal-login">Iniciar Sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
