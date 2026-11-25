// Sesión del navegador: se guarda el usuario y el token que devuelve el backend.
// sessionStorage: se borra al cerrar la pestaña.
const CLAVE = 'sesion';

export function guardarSesion({ usuario, token }) {
  sessionStorage.setItem(CLAVE, JSON.stringify({ usuario, token }));
}

export function obtenerSesion() {
  try {
    const raw = sessionStorage.getItem(CLAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const obtenerToken = () => obtenerSesion()?.token ?? null;
export const obtenerUsuarioSesion = () => obtenerSesion()?.usuario ?? null;

// Actualiza solo los datos del usuario y conserva el token
export function guardarUsuarioSesion(usuario) {
  const actual = obtenerSesion();
  if (actual) guardarSesion({ ...actual, usuario });
}

export const cerrarSesion = () => sessionStorage.removeItem(CLAVE);

// 'admin' se trata como 'administrador'
export const normalizarRol = (rol) => (rol === 'admin' ? 'administrador' : rol);

export function rutaInicioSegunRol(rol) {
  const rutas = { cliente: '/formulario', administrador: '/panel', admin: '/panel', empleado: '/panel', cajero: '/caja' };
  return rutas[rol] ?? '/';
}
