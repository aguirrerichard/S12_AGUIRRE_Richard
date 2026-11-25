import { api } from './client.js';

// POST /auth/login -> { token, usuario }   (401 clave incorrecta, 400 datos vacíos)
export const iniciarSesion = (correo, contrasena) =>
  api.post('/auth/login', { correo, contrasena }).then((r) => r.data);

// POST /auth/registro -> { token, usuario }   (409 si el correo ya existe)
export const registrarUsuario = (nombre, correo, contrasena) =>
  api.post('/auth/registro', { nombre, correo, contrasena }).then((r) => r.data);

// GET /auth/perfil -> datos actuales del usuario (por ejemplo, su turno)
export const obtenerPerfil = () => api.get('/auth/perfil').then((r) => r.data);
