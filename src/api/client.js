import axios from 'axios';
import { obtenerToken, cerrarSesion } from '../utils/sesion.js';

// Toda la app habla con el backend a través de esta única instancia.
// La URL sale de la variable de entorno: en local apunta a localhost y en Vercel a Render.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Antes de cada petición: si hay sesión, se envía el token en la cabecera
api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el backend responde 401 con una sesión abierta, el token venció o no sirve:
// se limpia la sesión y se manda al login. (El login fallido también es 401: se excluye.)
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const eraLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && obtenerToken() && !eraLogin) {
      cerrarSesion();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

// Convierte cualquier error de la API en un mensaje legible para la pantalla
export function mensajeDeError(err, porDefecto = 'No pudimos conectar con el servidor. Intenta de nuevo.') {
  return err.response?.data?.mensaje || porDefecto;
}
