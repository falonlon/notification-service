# Contrato REST - Notification Service E2

Este contrato describe el mock funcional de Fase 2. Los datos se guardan en memoria y se reinician al reiniciar el proceso.

## GET /

Descripcion: health check y resumen del servicio.

Request: sin parametros.

Response `200`:

```json
{
  "service": "G9 - Notification Service",
  "version": "1.0.0",
  "status": "running",
  "endpoints": [
    "GET  /",
    "POST /notifications/test",
    "GET  /notifications",
    "GET  /notifications/stats",
    "PATCH /notifications/:notificationId/read",
    "POST /notifications/subscriptions"
  ]
}
```

Errores posibles: no aplica en flujo normal.

## POST /notifications/test

Descripcion: simula la recepcion de un evento de otro grupo y crea una notificacion.

Request JSON:

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

Response `201`:

```json
{
  "notificationId": "NOTIF-0001",
  "eventId": "EVT-001",
  "eventType": "OrderCreated",
  "producer": "order-service",
  "correlationId": "corr-001",
  "userId": "USR-01",
  "type": "ORDER_CREATED",
  "title": "Pedido creado exitosamente",
  "message": "Tu pedido #ORD-1001 por $49990 CLP fue recibido y esta siendo procesado.",
  "read": false,
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

Errores posibles:

- `400 MISSING_EVENT_ID`
- `400 INVALID_EVENT_TYPE`
- `422 MISSING_USER_ID`
- `409 DUPLICATE_EVENT`

## GET /notifications

Descripcion: lista notificaciones creadas en memoria.

Query params:

| Parametro | Tipo | Descripcion |
|---|---|---|
| `userId` | string | Filtra por usuario |
| `eventType` | string | Filtra por evento de entrada |
| `type` | string | Filtra por tipo interno de notificacion |
| `producer` | string | Filtra por productor |
| `read` | boolean | Filtra por estado de lectura |
| `from` | ISO date | Fecha minima de creacion |
| `to` | ISO date | Fecha maxima de creacion |
| `page` | number | Pagina, por defecto `1` |
| `size` | number | Tamano de pagina, maximo `50` |

Response `200`:

```json
{
  "data": [
    {
      "notificationId": "NOTIF-0001",
      "eventId": "EVT-001",
      "eventType": "OrderCreated",
      "producer": "order-service",
      "correlationId": "corr-001",
      "userId": "USR-01",
      "type": "ORDER_CREATED",
      "title": "Pedido creado exitosamente",
      "message": "Tu pedido #ORD-1001 por $49990 CLP fue recibido y esta siendo procesado.",
      "read": false,
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 10,
    "total": 1,
    "totalPages": 1
  },
  "unreadCount": 1
}
```

Errores posibles: no aplica en flujo normal.

## GET /notifications/stats

Descripcion: retorna metricas basicas para reporteria.

Query params:

| Parametro | Tipo | Descripcion |
|---|---|---|
| `from` | ISO date | Fecha minima de creacion |
| `to` | ISO date | Fecha maxima de creacion |

Response `200`:

```json
{
  "total": 1,
  "unread": 1,
  "read": 0,
  "byProducer": {
    "order-service": 1
  },
  "byEventType": {
    "OrderCreated": 1
  },
  "generatedAt": "2026-06-01T10:00:00.000Z"
}
```

Errores posibles: no aplica en flujo normal.

## PATCH /notifications/:notificationId/read

Descripcion: marca una notificacion como leida.

Path params:

| Parametro | Tipo | Descripcion |
|---|---|---|
| `notificationId` | string | Identificador de la notificacion |

Response `200`:

```json
{
  "notificationId": "NOTIF-0001",
  "eventId": "EVT-001",
  "eventType": "OrderCreated",
  "producer": "order-service",
  "correlationId": "corr-001",
  "userId": "USR-01",
  "type": "ORDER_CREATED",
  "title": "Pedido creado exitosamente",
  "message": "Tu pedido #ORD-1001 por $49990 CLP fue recibido y esta siendo procesado.",
  "read": true,
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

Errores posibles:

- `404 NOTIFICATION_NOT_FOUND`

## POST /notifications/subscriptions

Descripcion: registra o reemplaza una suscripcion Web Push simulada para un usuario. En E2 no envia notificaciones push reales.

Request JSON:

```json
{
  "userId": "USR-01",
  "platform": "web",
  "subscription": {
    "endpoint": "https://push.example.test/subscription",
    "keys": {
      "p256dh": "demo-key",
      "auth": "demo-auth"
    }
  }
}
```

Response `201`:

```json
{
  "subscriptionId": "SUB-0001",
  "userId": "USR-01",
  "platform": "web",
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

Errores posibles:

- `422 MISSING_USER_ID`
- `400 INVALID_REQUEST`
