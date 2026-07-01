# Evidencia de pruebas - Servicio G9 Notificaciones

Fecha de ejecucion local: 2026-06-30  
Ambiente: Local  
Base URL: http://localhost:8000  
Persistencia: Supabase  
Servicio: notification-service standalone

## Resumen

| Caso | Endpoint | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| Health check | GET / | 200 running | 200 running | OK |
| Crear notificacion | POST /notifications/test | 201 Created | notificationId generado | OK |
| Listar por usuario | GET /notifications?userId=USR-LOCAL-01&page=1&size=10 | lista paginada | 1 registro, unreadCount 1 | OK |
| Idempotencia | POST repetido con mismo eventId | 409 DUPLICATE_EVENT | 409 | OK |
| Marcar como leida | PATCH /notifications/:id/read | read true | read true | OK |
| Stats | GET /notifications/stats | metricas agregadas | total 1, read 1, unread 0 | OK |
| Subscription | POST /notifications/subscriptions | 201 Created | subscriptionId generado | OK |

## Health check

Request:

```powershell
Invoke-RestMethod http://localhost:8000/
```

Resultado obtenido:

```json
{
  "service": "G9 - Notification Service",
  "version": "1.0.0",
  "status": "running"
}
```

Estado: OK.

## Crear notificacion

Request:

```text
POST http://localhost:8000/notifications/test
```

Body usado:

```json
{
  "eventId": "EVT-LOCAL-20260629224146",
  "eventType": "OrderCreated",
  "version": "1.0",
  "producer": "order-service",
  "correlationId": "corr-local-001",
  "payload": {
    "userId": "USR-LOCAL-01",
    "orderId": "ORD-LOCAL-001",
    "totalAmount": 49990,
    "currency": "CLP"
  }
}
```

Resultado obtenido:

```text
notificationId : NOTIF-1782787306600-pkrwzx
eventId        : EVT-LOCAL-20260629224146
eventType      : OrderCreated
producer       : order-service
correlationId  : corr-local-001
userId         : USR-LOCAL-01
type           : ORDER_CREATED
title          : Pedido creado exitosamente
message        : Tu pedido #ORD-LOCAL-001 por $49990 CLP fue recibido y esta siendo procesado.
read           : False
createdAt      : 2026-06-30T02:41:46.599+00:00
```

El registro quedo persistido en Supabase en la tabla `notifications`.

Estado: OK.

## Listar por usuario

Request:

```text
GET http://localhost:8000/notifications?userId=USR-LOCAL-01&page=1&size=10
```

Resultado obtenido:

- `data` retorno 1 notificacion.
- `pagination.page`: 1.
- `pagination.size`: 10.
- `pagination.total`: 1.
- `pagination.totalPages`: 1.
- `unreadCount`: 1.

La paginacion respondio con los valores esperados para el filtro por usuario.

Estado: OK.

## Idempotencia

Se repitio el mismo `POST /notifications/test` usando el mismo `eventId`:

```text
EVT-LOCAL-20260629224146
```

Resultado obtenido:

```text
409
```

La respuesta valida que `processed_events` evita duplicados por `eventId`.

Estado: OK.

## Marcar como leida

Request:

```text
PATCH http://localhost:8000/notifications/NOTIF-1782787306600-pkrwzx/read
```

Resultado obtenido:

```json
{
  "read": true
}
```

Estado: OK.

## Stats

Request:

```text
GET http://localhost:8000/notifications/stats
```

Resultado obtenido:

```json
{
  "total": 1,
  "unread": 0,
  "read": 1,
  "byProducer": {
    "order-service": 1
  },
  "byEventType": {
    "OrderCreated": 1
  },
  "generatedAt": "2026-06-30T02:44:36.590Z"
}
```

Estado: OK.

## Subscription

Request:

```text
POST http://localhost:8000/notifications/subscriptions
```

Body usado:

```json
{
  "userId": "USR-LOCAL-01",
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

Resultado obtenido:

```text
subscriptionId           userId       platform createdAt
SUB-1782787485002-1s6gf2 USR-LOCAL-01 web      2026-06-30T02:44:45.002+00:00
```

El resultado valida la persistencia en Supabase en la tabla `push_subscriptions`.

Estado: OK.

## Conclusion

Las pruebas locales confirman que el servicio G9 ya no depende de memoria para el flujo principal. Las notificaciones, eventos procesados y subscriptions se persisten en Supabase, manteniendo el contrato HTTP definido para los demas grupos.

Pendiente externo: validar los mismos casos contra la URL publica de Render una vez que las variables de entorno esten configuradas y el servicio sea redeployado.
