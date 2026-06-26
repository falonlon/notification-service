# Casos de prueba manuales E2

Ejecutar contra `http://localhost:8000` o `https://notification-service-i3bn.onrender.com`.

## 1. Health check

Objetivo: verificar que el servicio responde.

Request:

```http
GET / HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con `status: "running"` y lista de endpoints.

## 2. Crear notificacion OrderCreated

Objetivo: crear una notificacion valida.

Request:

```http
POST /notifications/test HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
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
}
```

Resultado esperado: `201` con `notificationId`, `type: "ORDER_CREATED"` y `read: false`.

## 3. Listar notificaciones por userId

Objetivo: consultar notificaciones del usuario.

Request:

```http
GET /notifications?userId=USR-01 HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con arreglo `data` filtrado por `USR-01`.

## 4. Listar con paginacion

Objetivo: validar paginacion.

Request:

```http
GET /notifications?page=1&size=10 HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con `pagination.page: 1` y `pagination.size: 10`.

## 5. Filtrar por read=false

Objetivo: obtener solo notificaciones no leidas.

Request:

```http
GET /notifications?read=false HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con notificaciones donde `read` es `false`.

## 6. Marcar como leida

Objetivo: actualizar estado de lectura.

Request:

```http
PATCH /notifications/NOTIF-0001/read HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con `read: true`.

## 7. Consultar stats

Objetivo: revisar metricas basicas.

Request:

```http
GET /notifications/stats HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con `total`, `unread`, `read`, `byProducer` y `byEventType`.

## 8. Probar eventType invalido

Objetivo: validar rechazo de eventos no soportados.

Request:

```http
POST /notifications/test HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "eventId": "EVT-INVALID",
  "eventType": "UnknownEvent",
  "payload": {
    "userId": "USR-01"
  }
}
```

Resultado esperado: `400 INVALID_EVENT_TYPE`.

## 9. Probar falta de userId

Objetivo: validar obligatoriedad de `payload.userId`.

Request:

```http
POST /notifications/test HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "eventId": "EVT-NO-USER",
  "eventType": "OrderCreated",
  "payload": {
    "orderId": "ORD-1002"
  }
}
```

Resultado esperado: `422 MISSING_USER_ID`.

## 10. Probar duplicado por eventId

Objetivo: validar idempotencia basica.

Request: repetir el mismo cuerpo usado para `EVT-001`.

Resultado esperado: `409 DUPLICATE_EVENT` y no se crea una nueva notificacion.

## 11. Registrar Web Push subscription

Objetivo: registrar una suscripcion simulada.

Request:

```http
POST /notifications/subscriptions HTTP/1.1
Host: localhost:8000
Content-Type: application/json

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

Resultado esperado: `201` con `subscriptionId`.

## 12. Consultar stats luego de crear varios eventos

Objetivo: validar acumulacion por productor y tipo.

Request:

```http
GET /notifications/stats HTTP/1.1
Host: localhost:8000
```

Resultado esperado: `200` con contadores actualizados en `byProducer` y `byEventType`.
