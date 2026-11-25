import { api } from './client.js';

// GET /facturacion/:suministro -> recibos del suministro (404 si el suministro no existe)
export const consultarRecibos = (suministro) =>
  api.get(`/facturacion/${encodeURIComponent(suministro)}`).then((r) => r.data);

// POST /facturacion/:suministro/pago -> el backend lee el monto de la BD, no de la pantalla
export const pagarRecibo = (suministro, { titular, ultimos4 }) =>
  api.post(`/facturacion/${encodeURIComponent(suministro)}/pago`, { titular, ultimos4 }).then((r) => r.data);
