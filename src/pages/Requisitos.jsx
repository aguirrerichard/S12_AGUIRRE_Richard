import { Link } from "react-router-dom";
import "../styles/requisitos.css";

export default function Requisitos() {
  return (
    <div className="pg-requisitos">

    <div className="banner-interno" style={{ backgroundImage: "linear-gradient(rgba(10,37,64,0.85), rgba(10,37,64,0.85)), url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80')" }}>
        <div className="contenido-banner">
            <h1>Guía de Requisitos</h1>
            <p>Conoce la documentación necesaria para tus trámites</p>
        </div>
    </div>

    <section className="contenedor-requisitos">
        <div className="grid-requisitos">
            
            
            <div className="tarjeta-req">
                <div className="cabecera-req">
                    <i className="fa-solid fa-house-chimney"></i>
                    <h3>Nuevo Suministro</h3>
                </div>
                <div className="cuerpo-req">
                    <p>Para solicitar un nuevo medidor en tu domicilio:</p>
                    <ul className="lista-check">
                        <li><i className="fa-solid fa-check"></i> Copia del DNI del titular.</li>
                        <li><i className="fa-solid fa-check"></i> Documento de propiedad (Título, HR/PU o Constancia de Posesión).</li>
                        <li><i className="fa-solid fa-check"></i> Croquis de ubicación simple.</li>
                        <li><i className="fa-solid fa-check"></i> El predio debe contar con caja porta medidor instalada.</li>
                    </ul>
                    <Link to="/formulario?tipo=nuevo" className="btn-req">Solicitar ahora</Link>
                </div>
            </div>

            
            <div className="tarjeta-req">
                <div className="cabecera-req">
                    <i className="fa-solid fa-users"></i>
                    <h3>Cambio de Titularidad</h3>
                </div>
                <div className="cuerpo-req">
                    <p>Si eres el nuevo propietario y deseas el recibo a tu nombre:</p>
                    <ul className="lista-check">
                        <li><i className="fa-solid fa-check"></i> Copia del DNI del nuevo titular.</li>
                        <li><i className="fa-solid fa-check"></i> Copia literal o contrato de compra-venta notariado.</li>
                        <li><i className="fa-solid fa-check"></i> El suministro no debe registrar deudas pendientes.</li>
                        <li><i className="fa-solid fa-check"></i> Foto del último recibo cancelado.</li>
                    </ul>
                    <Link to="/formulario?tipo=cambio" className="btn-req">Solicitar ahora</Link>
                </div>
            </div>

        </div>
    </section>
    </div>
  );
}
