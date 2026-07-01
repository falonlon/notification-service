# Eventos aceptados

El endpoint `POST /notifications/test` acepta estos `eventType`:

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

## Campos base

- `eventId`: identificador idempotente del evento. Es obligatorio.
- `eventType`: tipo de evento. Debe estar en la lista soportada.
- `version`: version del contrato del productor.
- `occurredAt`: fecha de ocurrencia del evento en ISO 8601.
- `producer`: servicio emisor.
- `correlationId`: identificador de trazabilidad.
- `payload.userId`: usuario receptor de la notificacion. Es obligatorio.

## Idempotencia

El servicio mantiene la idempotencia en la tabla `processed_events` de Supabase. Si llega el mismo `eventId` mas de una vez, responde `409 DUPLICATE_EVENT` y no crea otra notificacion.
