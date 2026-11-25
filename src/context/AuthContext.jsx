import { createContext, useContext, useState } from "react";
import * as authApi from "../api/auth.api";
import * as sesion from "../utils/sesion";

const AuthContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(sesion.obtenerUsuarioSesion());

  // Devuelve el usuario, o null si el correo o la contraseña son incorrectos (401)
  async function login(correo, pass) {
    try {
      const datos = await authApi.iniciarSesion(correo, pass);
      sesion.guardarSesion(datos);
      setUsuario(datos.usuario);
      return datos.usuario;
    } catch (err) {
      if (err.response?.status === 401) return null;
      throw err;
    }
  }

  async function registrar(nombre, correo, pass) {
    const datos = await authApi.registrarUsuario(nombre, correo, pass);
    sesion.guardarSesion(datos);
    setUsuario(datos.usuario);
    return datos.usuario;
  }

  function logout() {
    sesion.cerrarSesion();
    setUsuario(null);
  }

  // Para refrescar los datos del usuario (por ejemplo, el turno que viene de la BD)
  function actualizarUsuario(u) {
    sesion.guardarUsuarioSesion(u);
    setUsuario(u);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, registrar, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}
