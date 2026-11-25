import { useEffect, useState } from "react";
import { listarPendientesCliente } from "../api/pagos.api";

// Solicitudes del cliente que aún deben pagarse. "activo" evita guardar datos si la página ya se cerró.
export function usePendientesCliente() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    listarPendientesCliente()
      .then((lista) => { if (activo) setPendientes(lista); })
      .catch((e) => { console.error(e); if (activo) setError(true); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  return { pendientes, cargando, error };
}
