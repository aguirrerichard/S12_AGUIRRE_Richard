import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import TarjetaServicio from "../components/TarjetaServicio";
import { consultarSeguimiento, crearReclamoRapido } from "../api/reclamos.api";
import { mensajeDeError } from "../api/client";

const TARJETAS = [
  { img: "photo-1554224155-8d04cb21cd6c", etiqueta: "Pagos", titulo: "Consulta y Pago de Recibo",
    texto: "Revisa tu último estado de cuenta, historial de consumos y paga de inmediato sin salir de casa.",
    link: "/servicios", accion: "Pagar ahora" },
  { img: "photo-1581092921461-eab62e97a780", etiqueta: "Trámites", titulo: "Nuevo Suministro",
    texto: "Inicia el proceso documentario para obtener un nuevo medidor de luz para tu vivienda o negocio.",
    link: "/servicios", accion: "Iniciar trámite" },
  { img: "photo-1621905251189-08b45d6a269e", etiqueta: "Soporte 24/7", titulo: "Reportar Averías",
    texto: "¿Estás sin servicio o viste un poste dañado? Nuestro equipo técnico está listo para atenderte.",
    link: "/contacto", accion: "Reportar falla" },
];

const soloNumeros = (valor) => valor.replace(/[^0-9]/g, "");
const FORM_VACIO = { dni: "", nombre: "", suministro: "", comentario: "" };

export default function Inicio() {
  const { usuario } = useAuth();
  const { notificar, confirmar } = useToast();
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [resultado, setResultado] = useState(null); // { tipo: cargando | ok | vacio | error, reclamo? }
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);

  // Si no hay sesión, ofrece ir al login y devuelve true (bloquea la acción)
  async function exigirLogin() {
    if (usuario?.id) return false;
    const ir = await confirmar("Inicio de Sesión Requerido",
      "Para realizar este trámite debes iniciar sesión.", "Iniciar sesión", "Cancelar");
    if (ir) navigate("/login?redirect=/");
    return true;
  }

  async function buscar(e) {
    e.preventDefault();
    if (await exigirLogin()) return;
    const valor = busqueda.trim();
    if (!valor) return;
    setResultado({ tipo: "cargando" });
    try {
      const reclamo = await consultarSeguimiento(valor);
      setResultado({ tipo: "ok", reclamo });
    } catch (err) {
      if (err.response?.status === 404) return setResultado({ tipo: "vacio" });
      console.error(err);
      setResultado({ tipo: "error" });
    }
  }

  async function registrar(e) {
    e.preventDefault();
    if (await exigirLogin()) return;
    setEnviando(true);
    try {
      // El código de seguimiento lo genera el backend
      const { codigo } = await crearReclamoRapido({
        dni: form.dni.trim(), nombre: form.nombre.trim(),
        suministro: form.suministro.trim(), comentario: form.comentario.trim(),
      });
      notificar(`¡Reclamo guardado! Código: ${codigo}`, "exito", 6000);
      setForm(FORM_VACIO);
    } catch (err) {
      console.error(err);
      notificar(mensajeDeError(err, "Ocurrió un error al intentar registrar tu solicitud."), "error");
    } finally {
      setEnviando(false);
    }
  }

  const colorEstado = (estado) =>
    estado === "resuelto" || estado === "atendido" ? "#059669" : estado === "rechazado" ? "#dc2626" : "#0284c7";

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-tag"><i className="fa-solid fa-leaf"></i> Energía Sostenible para el Centro</div>
          <h2>Iluminando el <span>desarrollo</span> de nuestra región.</h2>
          <p>Brindamos un servicio de distribución eléctrica seguro, continuo y con calidez humana para Junín, Huánuco, Pasco, Huancavelica y Ayacucho.</p>
          <Link to="/servicios" className="btn-primary">
            Ingresar a Oficina Virtual <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      </section>

      <section className="seccion-destacada">
        <div className="cabecera-seccion">
          <h2>¿Qué necesitas hacer hoy?</h2>
          <p>Gestiona tus servicios desde la comodidad de tu hogar de forma rápida, segura y transparente.</p>
        </div>
        <div className="cuadricula-tarjetas">
          {TARJETAS.map((t) => <TarjetaServicio key={t.titulo} servicio={t} />)}
        </div>
      </section>

      <section id="seccion-atencion-reclamos" className="seccion-reclamos-container">
        <div className="contenedor-publico-grid">

          <div className="card-publica">
            <div className="card-header-pub">
              <div className="icono-pub"><i className="fa-solid fa-magnifying-glass"></i></div>
              <div>
                <h3>Consultar Estado de Reclamo</h3>
                <p>Ingresa tu Código de Seguimiento (ej. COD-20535815) o DNI</p>
              </div>
            </div>
            <form className="form-buscar-pub" onSubmit={buscar}>
              <div className="grupo-input-pub">
                <input type="text" required placeholder="Ej: 61055481 o COD-20535815"
                  value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <button type="submit" className="btn-buscar-pub"><i className="fa-solid fa-search"></i> Buscar</button>
              </div>
            </form>

            {resultado && (
              <div className="resultado-box-pub">
                {resultado.tipo === "cargando" && (
                  <p style={{ color: "#64748b", padding: 10 }}><i className="fa-solid fa-spinner fa-spin"></i> Buscando en la base de datos...</p>
                )}
                {resultado.tipo === "ok" && (
                  <div style={{ padding: 16, border: "1px solid #e2e8f0", borderLeft: "4px solid #ff7a00", borderRadius: 10, background: "#f8fafc", marginTop: 15, textAlign: "left" }}>
                    <h4 style={{ marginBottom: 10, color: "#0f172a", fontSize: "1rem" }}>
                      <i className="fa-solid fa-circle-check" style={{ color: "#ff7a00" }}></i> Reclamo Encontrado
                    </h4>
                    <p><strong>Cliente:</strong> {resultado.reclamo.nombre_cliente || "No especificado"}</p>
                    <p><strong>Código:</strong> {resultado.reclamo.codigo_seguimiento}</p>
                    <p><strong>Motivo:</strong> {resultado.reclamo.motivo}</p>
                    <p>
                      <strong>Estado Actual:</strong>{" "}
                      <span style={{ fontWeight: "bold", color: colorEstado(resultado.reclamo.estado) }}>
                        {(resultado.reclamo.estado || "registrado").replace("_", " ").toUpperCase()}
                      </span>
                    </p>
                  </div>
                )}
                {resultado.tipo === "vacio" && (
                  <div style={{ padding: 15, border: "1px solid #fee2e2", borderRadius: 10, background: "#fef2f2", marginTop: 15, color: "#dc2626", textAlign: "left" }}>
                    <p style={{ margin: 0 }}><i className="fa-solid fa-triangle-exclamation"></i> No se encontró ningún trámite con ese Código o DNI.</p>
                  </div>
                )}
                {resultado.tipo === "error" && <p style={{ color: "#dc2626", padding: 10 }}>Error al conectar con la base de datos.</p>}
              </div>
            )}
          </div>

          <div className="card-publica">
            <div className="card-header-pub">
              <div className="icono-pub naranja"><i className="fa-solid fa-file-pen"></i></div>
              <div>
                <h3>Registrar Reclamo por Cobro Excesivo</h3>
                <p>Completa el formulario para ingresar tu solicitud al sistema</p>
              </div>
            </div>
            <form className="form-grid-pub" onSubmit={registrar}>
              <div className="campo-pub">
                <label htmlFor="pub-dni">DNI / RUC *</label>
                <input id="pub-dni" required maxLength={8} pattern="\d{8}" title="Debe contener exactamente 8 números"
                  placeholder="Ej: 61055481" value={form.dni} onChange={(e) => setForm({ ...form, dni: soloNumeros(e.target.value) })} />
              </div>
              <div className="campo-pub">
                <label htmlFor="pub-nombre">Nombre Completo *</label>
                <input id="pub-nombre" required placeholder="Ej: Jhoshua Silva" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="campo-pub">
                <label htmlFor="pub-suministro">N° de Suministro *</label>
                <input id="pub-suministro" required minLength={6} maxLength={8} pattern="\d{6,8}"
                  title="Debe contener entre 6 y 8 números" placeholder="Ej: 29381925" value={form.suministro}
                  onChange={(e) => setForm({ ...form, suministro: soloNumeros(e.target.value) })} />
              </div>
              <div className="campo-pub">
                <label>Motivo</label>
                <input type="text" value="Reclamo por Cobro Excesivo" readOnly className="input-readonly" />
              </div>
              <div className="campo-pub full">
                <label htmlFor="pub-comentario">Sustento / Breve Detalle *</label>
                <textarea id="pub-comentario" rows={3} required placeholder="Describa la disconformidad con el cobro en su recibo..."
                  value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} />
              </div>
              <div className="campo-pub full">
                <button type="submit" className="btn-enviar-pub" disabled={enviando}>
                  <i className={enviando ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane"}></i>{" "}
                  {enviando ? "Registrando..." : "Enviar Reclamo"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </section>
    </>
  );
}
