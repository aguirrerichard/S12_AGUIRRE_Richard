import { createContext, useCallback, useContext, useRef, useState } from "react";
import "../styles/notificaciones.css";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const ICONOS = {
  exito: "fa-circle-check",
  error: "fa-circle-xmark",
  advertencia: "fa-triangle-exclamation",
  info: "fa-circle-info",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialogo, setDialogo] = useState(null);
  const contador = useRef(0);

  // notificar("Mensaje", "exito" | "error" | "advertencia" | "info", milisegundos)
  const notificar = useCallback((mensaje, tipo = "info", duracion = 4000) => {
    const id = ++contador.current;
    setToasts((t) => [...t, { id, mensaje, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duracion);
  }, []);

  // confirmar(titulo, mensaje) -> Promise<boolean>
  const confirmar = useCallback(
    (titulo, mensaje, textoConfirmar = "Aceptar", textoCancelar = "Cancelar") =>
      new Promise((resolve) =>
        setDialogo({ titulo, mensaje, textoConfirmar, textoCancelar, resolve })
      ),
    []
  );

  const responder = (valor) => {
    dialogo.resolve(valor);
    setDialogo(null);
  };

  return (
    <ToastContext.Provider value={{ notificar, confirmar }}>
      {children}

      <div id="lz-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`lz-toast lz-${t.tipo}`}>
            <i className={`fa-solid ${ICONOS[t.tipo] || ICONOS.info}`}></i>
            <div className="lz-toast-content">{t.mensaje}</div>
          </div>
        ))}
      </div>

      {dialogo && (
        <div className="lz-modal-overlay">
          <div className="lz-modal-box">
            <div className="lz-modal-icon"><i className="fa-solid fa-circle-question"></i></div>
            <h3>{dialogo.titulo}</h3>
            <p>{dialogo.mensaje}</p>
            <div className="lz-modal-actions">
              <button className="lz-btn-cancelar" onClick={() => responder(false)}>{dialogo.textoCancelar}</button>
              <button className="lz-btn-confirmar" onClick={() => responder(true)}>{dialogo.textoConfirmar}</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
