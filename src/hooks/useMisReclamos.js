import { useCallback, useEffect, useState } from "react";
import { listarMisReclamos } from "../api/reclamos.api";

// Carga los reclamos del cliente que inició sesión. "recargar" vuelve a pedirlos al backend.
export function useMisReclamos() {
  const [reclamos, setReclamos] = useState([]);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error

  const recargar = useCallback(async () => {
    try {
      setReclamos(await listarMisReclamos());
      setEstado("ok");
    } catch (error) {
      console.error("Error al obtener reclamos propios:", error);
      setEstado("error");
    }
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  return { reclamos, estado, recargar };
}
