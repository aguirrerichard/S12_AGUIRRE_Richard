import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { normalizarRol } from "../utils/sesion";

// <RutaProtegida roles={["cliente"]}> ... </RutaProtegida>
// Sin "roles": basta con haber iniciado sesión.
export default function RutaProtegida({ roles, children }) {
  const { usuario } = useAuth();
  const { notificar } = useToast();
  const ubicacion = useLocation();

  const sinSesion = !usuario?.id;
  const sinPermiso = !sinSesion && roles && !roles.includes(normalizarRol(usuario.rol));

  useEffect(() => {
    if (sinPermiso) notificar("Tu perfil no tiene acceso a esta página.", "error", 2500);
  }, [sinPermiso, notificar]);

  if (sinSesion) {
    const destino = encodeURIComponent(ubicacion.pathname + ubicacion.search);
    return <Navigate to={`/login?redirect=${destino}`} replace />;
  }
  if (sinPermiso) return <Navigate to="/" replace />;
  return children;
}
