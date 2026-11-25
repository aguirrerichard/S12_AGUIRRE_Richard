import { useCallback, useEffect, useState } from "react";
import { listarReclamos } from "../api/reclamos.api";
import { useToast } from "../context/ToastContext";

// Todos los reclamos (vista del administrador y del empleado)
export function useReclamos() {
  const { notificar } = useToast();
  const [reclamos, setReclamos] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState("cargando"); // cargando | ok | error

  const cargar = useCallback(async () => {
    try {
      setReclamos(await listarReclamos());
      setEstadoCarga("ok");
    } catch (error) {
      console.error("Error al cargar reclamos:", error);
      notificar("No se pudo conectar con el servidor.", "error");
      setEstadoCarga("error");
    }
  }, [notificar]);

  useEffect(() => { cargar(); }, [cargar]);

  return { reclamos, estadoCarga, cargar };
}
