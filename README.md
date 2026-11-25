# LuzCentro Perú · Frontend (React + Vite)

Oficina virtual de LuzCentro Perú: reclamos, trámites, consulta y pago de recibos, caja y panel de gestión.
Es la migración a React del proyecto del parcial (HTML, CSS y JavaScript nativo). **Solo el frontend**: los datos los entrega un backend en Node (semana 13).

## Cómo ejecutarlo

```bash
npm install
copy .env.example .env.local     # en Mac/Linux: cp .env.example .env.local
npm run dev                      # http://localhost:5173
```

`VITE_API_URL` es la dirección del backend (por defecto `http://localhost:3000/api`).
No hay contraseñas ni cadenas de Neon en este repositorio: el frontend nunca habla con la base de datos.

## Arquitectura

```
src/
├── main.jsx        Punto de entrada: monta React, el router y los contextos
├── App.jsx         Rutas: qué página se muestra para cada URL (y cuáles están protegidas)
├── pages/          Una pantalla por ruta (Inicio, Login, Formulario, Pago, Caja, Panel…)
├── components/     Piezas reutilizables: Layout, RutaProtegida, TarjetaServicio, TarjetaTramite
├── context/        Estado global: AuthContext (sesión) y ToastContext (avisos y confirmaciones)
├── hooks/          Lógica con useState/useEffect: useMisReclamos, useReclamos, usePendientesCliente
├── api/            Única capa que hace peticiones HTTP (axios) al backend
├── utils/          Funciones puras: tarifario, validaciones, sesión
└── styles/         CSS de cada página
```

**Cómo una URL llega a la pantalla:** `main.jsx` → `BrowserRouter` → `App.jsx` busca la ruta → `RutaProtegida` revisa sesión y rol → se dibuja la página → la página usa un hook o una función de `api/` → axios (`api/client.js`) llama a `VITE_API_URL`.

## Migración nativo → React (ejemplos)

| Antes (parcial) | Ahora |
|---|---|
| 3 bloques HTML copiados en la portada | `TarjetaServicio` + `TARJETAS.map()` |
| 3 tarjetas de trámites en `servicios.html` | `TarjetaTramite` + `TRAMITES.map()` |
| `document.getElementById` + `innerHTML` | `useState` y JSX |
| `sessionStorage` leído en cada `.js` | `AuthContext` + `useAuth()` |
| Un `.html` por página y `<script>` | Rutas de `react-router-dom` |
| Consultas SQL desde el navegador | Funciones de `api/` que llaman al backend |

## Validaciones

Conservadas del parcial: Luhn, marca, vencimiento y CVV de tarjeta; celular y código de billetera; DNI (8 dígitos) y suministro (6–8) en el panel; monto recibido en caja; turnos de empleados.
Mejoradas: correo válido y contraseña mínima en login/registro; correo válido en contacto; suministro solo numérico en cambio de titular; el **monto y el código ya no se calculan en el navegador** (los define el backend), y el token viaja en la cabecera `Authorization`.

## Contrato de la API que consume este frontend

Base: `VITE_API_URL`. Los errores devuelven `{ "mensaje": "..." }`. Las rutas con 🔒 llevan `Authorization: Bearer <token>`.

| Método y ruta | Quién | Respuesta |
|---|---|---|
| `POST /auth/login` `{correo, contrasena}` | público | `{token, usuario}` · 401 · 400 |
| `POST /auth/registro` `{nombre, correo, contrasena}` | público | `201 {token, usuario}` · 409 |
| `GET /auth/perfil` 🔒 | todos | usuario (con `turno`) |
| `GET /reclamos/seguimiento/:valor` 🔒 | todos | `{codigo_seguimiento, estado, motivo, nombre_cliente}` · 404 |
| `POST /reclamos/rapido` 🔒 | cliente | `{codigo}` |
| `POST /reclamos` 🔒 | cliente | `201 {id, codigo, monto_calculado, estado_pago}` |
| `GET /reclamos/mis` 🔒 | cliente | lista con `codigo_operacion` del pago aprobado |
| `PUT /reclamos/:id` 🔒 | cliente | 200 · 409 si ya está pagado o en atención |
| `POST /reclamos/cambio-titular` | público | `201 {codigo}` |
| `GET /reclamos` 🔒 | administrador, empleado | lista completa |
| `POST /reclamos/presencial` 🔒 | administrador, empleado | `201 {codigo, monto_calculado}` |
| `PUT /reclamos/:id/dictamen` `{estado, comentario}` 🔒 | administrador, empleado | 200 |
| `DELETE /reclamos/:id` 🔒 | administrador, empleado | 200 · 409 si tiene pagos |
| `POST /contacto` | todos | `201` |
| `GET /facturacion/:suministro` 🔒 | todos | lista de recibos · 404 |
| `POST /facturacion/:suministro/pago` `{titular, ultimos4}` 🔒 | todos | 200 |
| `GET /pagos/pendientes` 🔒 | cliente | lista |
| `GET /pagos/registro/:id` 🔒 | cliente | `{id, codigo_seguimiento, monto_calculado, estado_pago}` |
| `POST /pagos/tarjeta` `{registroId, numero, mes, anio, cvv, marca}` 🔒 | cliente | `{aprobado, codigo, motivo}` |
| `POST /pagos/billetera` `{registroId, proveedor, celular, codigoAprobacion}` 🔒 | cliente | `{aprobado, codigo, motivo}` |
| `GET /pagos/comprobante/:codigo` 🔒 | dueño o personal | pago con datos del reclamo · 404 |
| `GET /caja/pendientes?q=` 🔒 | cajero, administrador | lista |
| `POST /caja/cobros` `{registroId, metodo, montoRecibido, referencia}` 🔒 | cajero, administrador | `{codigo, vuelto}` · 409 |
| `GET /caja/pagos-en-linea?fecha&soloPorVerificar` 🔒 | cajero, administrador | lista |
| `PUT /caja/pagos/:id/verificar` 🔒 | cajero, administrador | 200 |
| `GET /caja/resumen?fecha` 🔒 | cajero, administrador | totales por canal y método |

## Publicación (semana 14)

En Vercel: variable `VITE_API_URL=https://tu-api.onrender.com/api`. Agrega un `vercel.json` con una reescritura a `index.html` para que las rutas de React funcionen al recargar.
