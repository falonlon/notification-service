# Modelo de datos objetivo

Este es un modelo objetivo para F3/F4. En Fase 2 el mock usa memoria.

Las tablas siguientes no estan persistidas en E2. Sirven como diseno para la siguiente fase. `dlq_events` es un diseno objetivo y no representa una DLQ real implementada en esta entrega.

## notifications

| Campo | Descripcion |
|---|---|
| `notification_id` | Identificador de la notificacion |
| `event_id` | Identificador del evento origen |
| `event_type` | Tipo de evento recibido |
| `producer` | Servicio o grupo productor |
| `correlation_id` | Identificador de trazabilidad |
| `user_id` | Usuario destinatario |
| `type` | Tipo interno de notificacion |
| `title` | Titulo mostrado al usuario |
| `message` | Mensaje generado |
| `read` | Estado de lectura |
| `push_sent` | Indica si se envio push en fases posteriores |
| `created_at` | Fecha de creacion |

## processed_events

| Campo | Descripcion |
|---|---|
| `id` | Identificador interno |
| `event_id` | Identificador unico del evento procesado |
| `event_type` | Tipo de evento |
| `producer` | Productor del evento |
| `processed_at` | Fecha de procesamiento |

## dlq_events

| Campo | Descripcion |
|---|---|
| `id` | Identificador interno |
| `event_id` | Identificador del evento fallido |
| `raw_payload` | Payload original recibido |
| `error_reason` | Motivo del error |
| `attempts` | Cantidad de intentos proyectada |
| `status` | Estado proyectado del evento |
| `next_retry_at` | Fecha proyectada de proximo reintento |
| `created_at` | Fecha de creacion |

## push_subscriptions

| Campo | Descripcion |
|---|---|
| `id` | Identificador interno |
| `user_id` | Usuario asociado |
| `platform` | Plataforma registrada |
| `subscription` | Datos de suscripcion Web Push |
| `created_at` | Fecha de registro |
