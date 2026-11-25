import { api } from './client.js';

// POST /contacto -> 201
export const enviarMensaje = (datos) => api.post('/contacto', datos).then((r) => r.data);
