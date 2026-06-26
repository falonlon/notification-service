# Notification Service - Grupo 9

## Mini Marketplace Cloud - Entrega 2

Repositorio del Grupo 9 para el servicio de notificaciones del proyecto Mini Marketplace Cloud.

El estado actual corresponde a un mock funcional de Entrega 2 y a una base documental para Fase 3. No implementa servicios cloud nuevos, integraciones reales por eventos, base de datos real, Web Push real ni componentes asincronos productivos.

En Fase 2 los eventos se simulan mediante `POST /notifications/test`. El servicio guarda datos temporalmente en memoria usando estructuras locales del proceso Node.js. Si el proceso se reinicia, los datos se pierden.

La persistencia cloud queda para Fase 3. La integracion real por eventos queda para fases posteriores.

## Estado actual del servicio

- API Node.js/Express desplegada en Render.
- Persistencia temporal en memoria.
- Contrato REST disponible.
- Mock listo para pruebas entre grupos.

## Estado de la entrega

| Campo | Valor |
|---|---|
| Fase | E2 - Mock entre grupos |
| Tipo | Mock API funcional |
| Persistencia | En memoria |
| Deploy | Render |
| URL publica | `https://notification-service-i3bn.onrender.com/` |
| Repositorio | `https://github.com/falonlon/notification-service.git` |

## Alcance de E2

El mock permite:

- Simular eventos de pedidos, pagos, inventario y despacho por HTTP.
- Generar notificaciones asociadas a un usuario.
- Consultar notificaciones con filtros y paginacion.
- Marcar notificaciones como leidas.
- Consultar metricas basicas del estado en memoria.
- Registrar una suscripcion Web Push simulada para pruebas de contrato.
- Validar idempotencia basica por `eventId` mientras el proceso siga activo.

## Fuera de alcance en esta etapa

- Base de datos real.
- DLQ real.
- Supabase Realtime.
- Web Push real.
- Autenticacion.
- Integracion final entre servicios.
- FCM real.
- Workers reales.
- Persistencia permanente.

## Endpoints disponibles

| Metodo | Path | Descripcion | Consumidor o proposito |
|---|---|---|---|
| `GET` | `/` | Health check y resumen de endpoints | Verificacion general |
| `POST` | `/notifications/test` | Simula la recepcion de un evento y crea una notificacion en memoria | Productores G5, G6, G7, G8 en E2 |
| `GET` | `/notifications` | Lista notificaciones con filtros y paginacion | G1, G11 |
| `GET` | `/notifications/stats` | Retorna metricas agregadas calculadas desde memoria | G10 |
| `PATCH` | `/notifications/:notificationId/read` | Marca una notificacion como leida en memoria | G1, G11 |
| `POST` | `/notifications/subscriptions` | Registra una suscripcion Web Push simulada en memoria | G1 |

## Eventos simulados aceptados

- `OrderCreated`
- `PaymentPending`
- `PaymentApproved`
- `PaymentRejected`
- `StockRejected`
- `ShipmentCreated`
- `ShipmentPicking`
- `ShipmentOutForDelivery`
- `ShipmentDelivered`
- `ShipmentFailed`

## Contrato de evento simulado

```json
{
  "eventId": "EVT-001",
  "eventType": "OrderCreated",
  "version": "1.0",
  "occurredAt": "2026-06-01T10:00:00Z",
  "producer": "order-service",
  "correlationId": "corr-001",
  "payload": {
    "userId": "USR-01",
    "orderId": "ORD-1001",
    "totalAmount": 49990,
    "currency": "CLP"
  }
}
```

## Reglas de validacion

- `eventId` es obligatorio.
- `eventType` debe ser valido.
- `payload.userId` es obligatorio.
- Si `eventId` ya fue procesado en la instancia activa, no se crea una notificacion duplicada.
- `size` de paginacion tiene maximo 50.

## Errores esperados

| HTTP | Codigo | Caso |
|---|---|---|
| `400` | `INVALID_EVENT_TYPE` | `eventType` inexistente o no soportado |
| `400` | `MISSING_EVENT_ID` | Falta `eventId` |
| `400` | `INVALID_REQUEST` | Request incompleto o invalido |
| `422` | `MISSING_USER_ID` | Falta `payload.userId` o `userId` |
| `409` | `DUPLICATE_EVENT` | `eventId` ya procesado en memoria |
| `404` | `NOTIFICATION_NOT_FOUND` | No existe la notificacion solicitada en memoria |

Formato estandar:

```json
{
  "timestamp": "2026-06-01T10:00:00.000Z",
  "status": 409,
  "code": "DUPLICATE_EVENT",
  "message": "El evento 'EVT-001' ya fue procesado. No se crea notificacion duplicada.",
  "correlationId": "corr-001"
}
```

## Ejecucion local

```bash
git clone https://github.com/falonlon/notification-service.git
cd notification-service
npm install
cp .env.example .env
npm run dev
```

El servicio queda disponible en `http://localhost:8000`.

## Pruebas rapidas con curl

Health check:

```bash
curl http://localhost:8000/
```

Crear evento `OrderCreated`:

```bash
curl -X POST http://localhost:8000/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVT-001",
    "eventType": "OrderCreated",
    "version": "1.0",
    "occurredAt": "2026-06-01T10:00:00Z",
    "producer": "order-service",
    "correlationId": "corr-001",
    "payload": {
      "userId": "USR-01",
      "orderId": "ORD-1001",
      "totalAmount": 49990,
      "currency": "CLP"
    }
  }'
```

Listar notificaciones por `userId`:

```bash
curl "http://localhost:8000/notifications?userId=USR-01&page=1&size=10"
```

Probar idempotencia repitiendo el mismo `eventId`:

```bash
curl -X POST http://localhost:8000/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVT-001",
    "eventType": "OrderCreated",
    "producer": "order-service",
    "correlationId": "corr-001",
    "payload": {
      "userId": "USR-01",
      "orderId": "ORD-1001",
      "totalAmount": 49990,
      "currency": "CLP"
    }
  }'
```

Marcar como leida:

```bash
curl -X PATCH http://localhost:8000/notifications/NOTIF-0001/read
```

Consultar stats:

```bash
curl http://localhost:8000/notifications/stats
```

Registrar subscription simulada:

```bash
curl -X POST http://localhost:8000/notifications/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USR-01",
    "platform": "web",
    "subscription": {
      "endpoint": "https://push.example.test/subscription",
      "keys": {
        "p256dh": "demo-key",
        "auth": "demo-auth"
      }
    }
  }'
```

## Dependencias con otros grupos

| Grupo | Rol en E2 |
|---|---|
| G5 Pedidos | Productor simulado de `OrderCreated` |
| G6 Pagos | Productor simulado de `PaymentPending`, `PaymentApproved`, `PaymentRejected` |
| G7 Inventario | Productor simulado de `StockRejected` |
| G8 Despacho | Productor simulado de eventos `Shipment*` |
| G10 Reporteria | Consumidor de `GET /notifications/stats` |
| G11 ChatBot | Consumidor parcial de `GET /notifications` y `PATCH /read` |
| G1 Frontend | Consumidor de `GET /notifications`, `PATCH /read` y `POST /subscriptions` |

En Fase 2 la recepcion de eventos se simula mediante `POST /notifications/test`.

## Modelo de datos objetivo

En E2 el mock usa memoria. Las siguientes entidades son parte del modelo objetivo para persistencia en Fase 3 o fases posteriores, pero no existen actualmente en una base de datos:

- `notifications`
- `processed_events`
- `dlq_events`
- `push_subscriptions`

## Deploy Render

| Campo | Valor |
|---|---|
| Runtime | Node.js 20 |
| Build command | `npm install` |
| Start command | `npm start` |
| Branch | `main` |
| URL publica | `https://notification-service-i3bn.onrender.com/` |
