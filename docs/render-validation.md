# Validacion Render - Servicio G9

Repo:

https://github.com/falonlon/notification-service

Branch:

`main`

Root Directory:

Raiz del repositorio.

URL publica:

https://notification-service-i3bn.onrender.com/

## Build y start

- Build Command: `npm install`
- Start Command: `npm start`

## Variables requeridas en Render

Configurar en Environment:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY

Importante:

- SUPABASE_URL debe usar la URL base del proyecto.
- No usar `/rest/v1/`.
- No subir `.env` al repositorio.
- Las keys reales se configuran directamente en Render.

Formato esperado:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

## Estado de validacion publica

La validacion publica en Render queda pendiente hasta ejecutar redeploy desde el repositorio standalone con las variables Supabase configuradas. No se debe considerar validado el despliegue si sigue generando IDs secuenciales del servicio antiguo.

## Checklist de redeploy

* [ ] Variables configuradas en Render.
* [ ] Manual Redeploy ejecutado.
* [ ] GET / responde status running.
* [ ] POST /notifications/test crea notificacion.
* [ ] GET /notifications lista la notificacion creada.
* [ ] Repetir eventId responde 409.
* [ ] PATCH /notifications/:id/read marca como leida.
* [ ] GET /notifications/stats entrega metricas.
* [ ] POST /notifications/subscriptions guarda subscription.

## Checklist de configuracion Render

* [ ] Repo configurado como `https://github.com/falonlon/notification-service`.
* [ ] Branch configurada como `main`.
* [ ] Root Directory configurado en blanco o como raiz del repositorio.
* [ ] Build Command configurado como `npm install`.
* [ ] Start Command configurado como `npm start`.
* [ ] `SUPABASE_URL` configurada con URL base sin `/rest/v1/`.
* [ ] `SUPABASE_ANON_KEY` configurada.
* [ ] `SUPABASE_SERVICE_KEY` configurada.

## Comandos de prueba Render

Health check:

```bash
curl https://notification-service-i3bn.onrender.com/
```

Crear notificacion:

```bash
curl -X POST https://notification-service-i3bn.onrender.com/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"eventId":"EVT-RENDER-001","eventType":"OrderCreated","version":"1.0","occurredAt":"2026-06-30T02:45:00Z","producer":"order-service","correlationId":"corr-render-001","payload":{"userId":"USR-RENDER-01","orderId":"ORD-RENDER-001","totalAmount":49990,"currency":"CLP"}}'
```

Listar:

```bash
curl "https://notification-service-i3bn.onrender.com/notifications?userId=USR-RENDER-01&page=1&size=10"
```

Stats:

```bash
curl https://notification-service-i3bn.onrender.com/notifications/stats
```
