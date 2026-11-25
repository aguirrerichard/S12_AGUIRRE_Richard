import { Link } from "react-router-dom";

// Tarjeta de la portada: antes eran 3 bloques HTML repetidos, ahora es 1 componente + .map()
export default function TarjetaServicio({ servicio }) {
  const { img, etiqueta, titulo, texto, link, accion } = servicio;
  return (
    <div className="tarjeta">
      <div className="tarjeta-img"
        style={{ backgroundImage: `url('https://images.unsplash.com/${img}?auto=format&fit=crop&w=800&q=80')` }}>
        <span className="etiqueta">{etiqueta}</span>
      </div>
      <div className="tarjeta-cuerpo">
        <h3>{titulo}</h3>
        <p>{texto}</p>
        <Link to={link} className="enlace-tarjeta">{accion} <i className="fa-solid fa-chevron-right"></i></Link>
      </div>
    </div>
  );
}
