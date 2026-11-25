import { api } from './client.js';

// GET /caja/pendientes?q= -> solicitudes por cobrar
export const buscarPendientes = (criterio = '') =>
  api.get('/caja/pendientes', { params: { q: criterio.trim() } }).then((r) => r.data);

// POST /caja/cobros -> { codigo, vuelto }
export const cobrarPresencial = (datos) => api.post('/caja/cobros', datos).then((r) => r.data);

// GET /caja/pagos-en-linea?fecha=AAAA-MM-DD&soloPorVerificar=true|false
export const listarPagosEnLinea = (fecha, soloPorVerificar) =>
  api.get('/caja/pagos-en-linea', { params: { fecha, soloPorVerificar } }).then((r) => r.data);

// PUT /caja/pagos/:id/verificar
export const verificarPago = (idPago) => api.put(`/caja/pagos/${idPago}/verificar`).then((r) => r.data);

// GET /caja/resumen?fecha=AAAA-MM-DD -> totales por canal y método
export const resumenDelDia = (fecha) => api.get('/caja/resumen', { params: { fecha } }).then((r) => r.data);
