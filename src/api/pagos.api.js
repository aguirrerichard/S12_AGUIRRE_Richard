import { api } from './client.js';

// GET /pagos/pendientes -> solicitudes del cliente con pago pendiente
export const listarPendientesCliente = () => api.get('/pagos/pendientes').then((r) => r.data);

// GET /pagos/registro/:id -> el monto SIEMPRE viene de la base de datos
export const obtenerRegistro = (id) => api.get(`/pagos/registro/${id}`).then((r) => r.data);

// POST /pagos/tarjeta y /pagos/billetera -> { aprobado, codigo, motivo }
// Un pago rechazado por la entidad NO es un error HTTP: llega como aprobado:false con su motivo.
export const pagarConTarjeta = (datos) => api.post('/pagos/tarjeta', datos).then((r) => r.data);
export const pagarConBilletera = (datos) => api.post('/pagos/billetera', datos).then((r) => r.data);

// GET /pagos/comprobante/:codigo (404 si no existe o no es del cliente)
export const obtenerComprobante = (codigo) =>
  api.get(`/pagos/comprobante/${encodeURIComponent(codigo)}`).then((r) => r.data);
