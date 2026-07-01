# Modelo de datos Supabase

Modelo implementado en Supabase para Fase 3. El servicio ya no depende de memoria local para notificaciones, eventos procesados ni subscriptions.

## notifications

Tabla para notificaciones visibles por usuario.

Campos:

- `notification_id`
- `event_id`
- `event_type`
- `producer`
- `correlation_id`
- `user_id`
- `type`
- `title`
- `message`
- `read`
- `push_sent`
- `created_at`
- `read_at`

`event_id` tiene indice unico para evitar notificaciones duplicadas por evento.

## processed_events

Tabla para idempotencia por evento.

Campos:

- `event_id`
- `event_type`
- `producer`
- `correlation_id`
- `processed_at`

`event_id` es primary key. Si un evento ya existe, `POST /notifications/test` responde `409 DUPLICATE_EVENT`.

## push_subscriptions

Tabla para guardar subscriptions por usuario.

Campos:

- `subscription_id`
- `user_id`
- `platform`
- `subscription`
- `created_at`
- `updated_at`

La tabla solo guarda subscriptions. No envia Web Push real en esta fase.

## dlq_events

`dlq_events` queda documentado solo como diseno futuro. No existe DLQ real implementada en la fase actual.
