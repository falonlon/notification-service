# Contrato HTTP - Grupo 9 Notificaciones

Base local: `http://localhost:8000`

Base cloud: `https://notification-service-i3bn.onrender.com`

## GET /

Retorna estado del servicio y lista de endpoints.

Respuesta `200`:

```json
{
  "service": "G9 - Notification Service",
  "version": "1.0.0",
  "status": "running",
  "endpoints": []
}
```

## POST /notifications/test

Recibe un evento de negocio y crea una notificacion persistida en Supabase.

Request:

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

Respuesta `201`:

```json
{
  "notificationId": "NOTIF-1782787306600-pkrwzx",
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

Errores:

- `400 MISSING_EVENT_ID`: falta `eventId`.
- `400 INVALID_EVENT_TYPE`: `eventType` no soportado.
- `422 MISSING_USER_ID`: falta `payload.userId`.
- `409 DUPLICATE_EVENT`: `eventId` ya procesado.
- `500 DATABASE_ERROR`: error al consultar o persistir en Supabase.

## GET /notifications

Lista notificaciones persistidas en Supabase con filtros opcionales.

Query params:

- `userId`
- `eventType`
- `type`
- `producer`
- `read`
- `from`
- `to`
- `page`
- `size`

Respuesta `200`:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "size": 10,
    "total": 0,
    "totalPages": 0
  },
  "unreadCount": 0
}
```

Error:

- `500 DATABASE_ERROR`: error al consultar Supabase.

## GET /notifications/stats

Retorna metricas agregadas desde las notificaciones persistidas en Supabase.

Query params:

- `from`
- `to`

Respuesta `200`:

```json
{
  "total": 0,
  "unread": 0,
  "read": 0,
  "byProducer": {},
  "byEventType": {},
  "generatedAt": "2026-06-01T10:00:00.000Z"
}
```

## PATCH /notifications/:notificationId/read

Marca una notificacion como leida.

Respuesta `200`: notificacion actualizada.

Error:

- `404 NOTIFICATION_NOT_FOUND`: no existe la notificacion.
- `500 DATABASE_ERROR`: error al consultar o actualizar Supabase.

## POST /notifications/subscriptions

Registra o reemplaza una subscription mock asociada a un usuario.

Request:

```json
{
  "userId": "USR-01",
  "platform": "web",
  "subscription": {
    "endpoint": "https://example.com/mock-push-endpoint",
    "keys": {
      "p256dh": "mock-p256dh",
      "auth": "mock-auth"
    }
  }
}
```

Respuesta `201`:

```json
{
  "subscriptionId": "SUB-1782787485002-1s6gf2",
  "userId": "USR-01",
  "platform": "web",
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

Errores:

- `422 MISSING_USER_ID`: falta `userId`.
- `400 INVALID_REQUEST`: falta `subscription`.
- `500 DATABASE_ERROR`: error al consultar o guardar en Supabase.
