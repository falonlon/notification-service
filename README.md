# Grupo 9 - Notificaciones

Servicio mock/cloud de notificaciones del Grupo 9 migrado a repositorio standalone.

Repositorio oficial:

`https://github.com/falonlon/notification-service`

## Ubicacion

Raiz del repositorio.

## Estado actual

El servicio funciona como backend Node.js desplegado en Render y persiste datos en Supabase.

URL publica:

`https://notification-service-i3bn.onrender.com/`

Supabase almacena `notifications`, `processed_events` y `push_subscriptions`. La DLQ real, Web Push real, workers reales e integracion con eventos reales por bus siguen fuera de alcance. `POST /notifications/test` se mantiene como endpoint de simulacion para integracion entre grupos.

## Nota de stack

Este servicio usa Node.js 20, JavaScript y Express 4.18.2.

G9 mantiene esta implementacion JavaScript porque el servicio ya se encuentra desplegado y funcionando en Render.

Esta decision es acotada al servicio de notificaciones y no cambia el contrato HTTP expuesto a los demas grupos.

## Endpoints

- `GET /`
- `POST /notifications/test`
- `GET /notifications`
- `GET /notifications/stats`
- `PATCH /notifications/:notificationId/read`
- `POST /notifications/subscriptions`

## Ejecucion local

```bash
npm install
npm start
```

El servicio escucha por defecto en `http://localhost:8000/`.

Para desarrollo:

```bash
npm run dev
```

## Variables de entorno

Crear un archivo `.env` local basado en `.env.example` cuando sea necesario.

```env
PORT=8000
NODE_ENV=development
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

El archivo `.env` real no se versiona.

## Persistencia Supabase

Ejecutar `supabase/schema.sql` en el SQL Editor del proyecto Supabase antes de iniciar el servicio.

Configurar estas variables en Render y en `.env` local:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

`SUPABASE_URL` debe ser la URL base del proyecto, por ejemplo `https://<project-ref>.supabase.co`, sin `/rest/v1/`.

El backend debe usar `SUPABASE_SERVICE_KEY` cuando este disponible. No subir `.env` ni credenciales reales al repositorio.

## Evidencia local Supabase

Se valido localmente que el servicio:

- Carga variables de entorno desde `.env`.
- Conecta correctamente con Supabase.
- Persiste notificaciones en `notifications`.
- Registra eventos procesados en `processed_events`.
- Evita duplicados por `eventId`.
- Marca notificaciones como leidas.
- Genera estadisticas desde datos persistidos.
- Registra subscriptions en `push_subscriptions`.

La evidencia detallada esta en:

`docs/test-evidence.md`

La validacion pendiente en Render esta documentada en:

`docs/render-validation.md`

## Pruebas con curl

Health check:

```bash
curl https://notification-service-i3bn.onrender.com/
```

Crear notificacion mock:

```bash
curl -X POST https://notification-service-i3bn.onrender.com/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"eventId":"EVT-001","eventType":"OrderCreated","version":"1.0","occurredAt":"2026-06-01T10:00:00Z","producer":"order-service","correlationId":"corr-001","payload":{"userId":"USR-01","orderId":"ORD-1001","totalAmount":49990,"currency":"CLP"}}'
```

Listar por usuario:

```bash
curl "https://notification-service-i3bn.onrender.com/notifications?userId=USR-01&page=1&size=10"
```

Consultar estadisticas:

```bash
curl https://notification-service-i3bn.onrender.com/notifications/stats
```

Marcar como leida:

```bash
curl -X PATCH https://notification-service-i3bn.onrender.com/notifications/NOTIF-1782787306600-pkrwzx/read
```

Registrar subscription mock:

```bash
curl -X POST https://notification-service-i3bn.onrender.com/notifications/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"userId":"USR-01","platform":"web","subscription":{"endpoint":"https://example.com/mock-push-endpoint","keys":{"p256dh":"mock-p256dh","auth":"mock-auth"}}}'
```

## Deploy Render

URL publica:
https://notification-service-i3bn.onrender.com/

Runtime:
Node.js 20

Repo:
https://github.com/falonlon/notification-service

Branch:
main

Root directory:
raiz del repositorio

Build command:
npm install

Start command:
npm start

Variables configuradas en Render:
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY

El archivo .env real no se versiona. Las variables productivas se configuran directamente en Render.

## Pendiente Fase 3

- Mantener endpoints actuales.
- Mantener idempotencia por `eventId`.
- Validar Render despues del redeploy con variables reales configuradas.
- No usar AWS.
- No implementar Web Push real.
- No implementar DLQ real salvo que se exija despues.
- Integracion real por bus/eventos si se exige despues.
