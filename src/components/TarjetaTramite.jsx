// Tarjeta de la oficina virtual: recibe sus datos y avisa con onIr cuando se pulsa el botón
export default function TarjetaTramite({ icono, titulo, texto, boton, onIr }) {
  return (
    <div className="tarjeta-tramite">
      <div className="icono-tramite"><i className={`fa-solid ${icono}`}></i></div>
      <div className="info-tramite">
        <h3>{titulo}</h3>
        <p>{texto}</p>
        <button className="btn-tramite requiere-auth" onClick={onIr}>{boton}</button>
      </div>
    </div>
  );
}
