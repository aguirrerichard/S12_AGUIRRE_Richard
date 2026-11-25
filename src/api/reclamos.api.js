import { api } from './client.js';

/* ---------- Cliente ---------- */

// GET /reclamos/seguimiento/:valor -> estado de un reclamo por código o DNI (404 si no existe)
export const consultarSeguimiento = (valor) =>
  api.get(`/reclamos/seguimiento/${encodeURIComponent(valor)}`).then((r) => r.data);

// POST /reclamos -> { id, codigo, monto_calculado, estado_pago }. El monto lo calcula el backend.
export const crearReclamo = (datos) => api.post('/reclamos', datos).then((r) => r.data);

// POST /reclamos/rapido -> reclamo breve desde el formulario del inicio
export const crearReclamoRapido = (datos) => api.post('/reclamos/rapido', datos).then((r) => r.data);

// POST /reclamos/cambio-titular -> { codigo }
export const crearCambioTitular = (datos) => api.post('/reclamos/cambio-titular', datos).then((r) => r.data);

// GET /reclamos/mis -> reclamos del usuario con el código de su pago aprobado
export const listarMisReclamos = () => api.get('/reclamos/mis').then((r) => r.data);

// PUT /reclamos/:id -> 200 si se actualizó; 409 si ya fue pagado o está en atención
export const actualizarReclamo = (id, datos) => api.put(`/reclamos/${id}`, datos).then((r) => r.data);

/* ---------- Administrador / empleado ---------- */

export const listarReclamos = () => api.get('/reclamos').then((r) => r.data);
export const crearReclamoPresencial = (datos) => api.post('/reclamos/presencial', datos).then((r) => r.data);
export const dictaminarReclamo = (id, estado, comentario) =>
  api.put(`/reclamos/${id}/dictamen`, { estado, comentario }).then((r) => r.data);
export const eliminarReclamo = (id) => api.delete(`/reclamos/${id}`).then((r) => r.data);
