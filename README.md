#  Notification Service — Grupo 9
### Mini Marketplace Cloud · Entrega 2

Servicio de notificaciones del ecosistema Mini Marketplace Cloud. Consume eventos de otros servicios vía **Supabase Realtime** y genera notificaciones persistentes para los usuarios.

---

## Mock público

ENTORNO Y URL 

Producción (Render):  https://notification-service-i3bn.onrender.com
Local: http://localhost:8000 

---

## Endpoints disponibles

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/notifications` | Listar notificaciones paginadas (filtros: userId, eventType, read, from, to) |
| `GET` | `/notifications/stats` | Métricas agregadas para G10 Reportería |
| `PATCH` | `/notifications/:id/read` | Marcar notificación como leída |
| `POST` | `/notifications/test` | **Solo testing** — inyectar evento manualmente |

---

##  Stack técnico

- **Runtime:** Node.js 20 + Express
- **Base de datos:** Supabase PostgreSQL
- **Integración de eventos:** Supabase Realtime (workers activos, no endpoints)
- **Push notifications:** FCM Firebase Cloud Messaging (pendiente acuerdo con G1)
- **DLQ:** Reintentos escalonados 10 min → 20 min → 30 min
- **Deploy:** Render (cloud free), deploy automático desde `main`

---

##  Estructura del proyecto

```
notification-service/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── notifications.routes.js
│   │   │   ├── stats.routes.js
│   │   │   └── test.routes.js
│   │   └── middlewares/
│   │       ├── validation.middleware.js
│   │       └── correlation.middleware.js
│   ├── listeners/
│   │   ├── supabase.listener.js   ← worker Supabase Realtime
│   │   ├── g5.handler.js
│   │   ├── g6.handler.js
│   │   ├── g7.handler.js
│   │   └── g8.handler.js
│   ├── services/
│   │   ├── notification.service.js
│   │   ├── idempotency.service.js
│   │   ├── dlq.service.js
│   │   └── push.service.js
│   ├── db/
│   │   └── supabase.js
│   └── app.js
├── jobs/
│   └── dlq.cron.js               ← reintentos DLQ cada 10 min
├── tests/
├── .env.example
├── package.json
└── README.md
```

---

##  Variables de entorno

Copiar `.env.example` a `.env` y completar:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
PORT=8000
FCM_SERVER_KEY=your-fcm-key
NODE_ENV=development
```

---

##  Cómo levantar localmente

```bash
# Clonar el repositorio
git clone https://github.com/grupo9/notification-service.git
cd notification-service

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Levantar en desarrollo
npm run dev

# El servicio queda disponible en http://localhost:8000
```

---

##  Pruebas rápidas con curl

```bash
# Simular un evento OrderCreated
curl -X POST http://localhost:8000/notifications/test \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: $(uuidgen)" \
  -H "X-Correlation-Id: $(uuidgen)" \
  -d '{
    "eventId": "test-001",
    "eventType": "OrderCreated",
    "version": "1.0",
    "occurredAt": "2026-06-01T10:00:00Z",
    "producer": "order-service",
    "correlationId": "corr-001",
    "payload": {
      "userId": "USR-01",
      "orderId": "ORD-1001",
      "totalAmount": 49970,
      "currency": "CLP"
    }
  }'

# Consultar notificaciones del usuario
curl "http://localhost:8000/notifications?userId=USR-01" \
  -H "X-Request-Id: $(uuidgen)" \
  -H "X-Correlation-Id: $(uuidgen)"
```

---

## 🔄 Cómo G9 recibe eventos (Supabase Realtime)

**G9 NO expone endpoints para recibir eventos.** En cambio, tiene workers que escuchan cambios en las tablas de Supabase de cada grupo productor:

| Grupo | Tabla escuchada | Evento generado |
|---|---|---|
| G5 Pedidos | `orders` (INSERT, status=CREATED) | `OrderCreated` |
| G6 Pagos | `payments` (UPDATE, status changes) | `PaymentPending/Approved/Rejected` |
| G7 Inventario | `stock_events` (INSERT) | `StockRejected` |
| G8 Despacho | `shipments` (UPDATE, status changes) | `Shipment*` |

> ⚠️ **Requisito crítico:** todos los grupos deben incluir `userId` en el payload del evento. Sin `userId`, G9 no puede asociar la notificación al usuario y el evento pasa a la Dead Letter Queue (DLQ).

---

##  Dead Letter Queue (DLQ)

Cuando un evento no puede procesarse, G9 lo guarda en la tabla `dlq_events` y reintenta con backoff escalonado:

```
Fallo inicial
    ↓ espera 10 min
Reintento 1
    ↓ espera 20 min (si falla)
Reintento 2  
    ↓ espera 30 min (si falla)
Reintento 3
    ↓ si falla → status='DEAD' + log de error
```

---

## Modelo de datos

| Tabla | Propósito |
|---|---|
| `notifications` | Notificaciones persistidas para usuarios |
| `processed_events` | Registro de eventIds procesados (idempotencia) |
| `dlq_events` | Eventos fallidos en espera de reintento |
| `device_tokens` | Tokens FCM por usuario (push mobile, pendiente G1) |

---

##  Dependencias del ecosistema

| Grupo | Tipo | Estado |
|---|---|---|
| G5 Pedidos | Productor → G9 consume | ✅ Confirmado (falta currency) |
| G6 Pagos | Productor → G9 consume | ⚠️ Falta userId en payload |
| G7 Inventario | Productor → G9 consume | ⚠️ Falta userId en payload |
| G8 Despacho | Productor → G9 consume | ⚠️ Falta userId + tabla Realtime |
| G1 Frontend/BFF | Consumidor de API REST | ⏳ Pendiente acuerdo web vs mobile |
| G10 Reportería | Consumidor de API REST | ✅ Confirmado |
| G11 ChatBot | Consumidor de API REST | ✅ Parcial |

---

##  Grupo 9 — Notificaciones
Mini Marketplace Cloud · Junio 2026
