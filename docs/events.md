# Eventos simulados E2

En Fase 2 la recepcion de eventos se simula mediante `POST /notifications/test`. No existen workers reales de Supabase Realtime en esta entrega.

## Formato estandar

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
    "orderId": "ORD-1001"
  }
}
```

## Reglas

- `eventId` es obligatorio y se usa para idempotencia.
- `eventType` debe estar en la lista de eventos aceptados.
- `payload.userId` es obligatorio para asociar la notificacion al usuario.
- Si se repite un `eventId`, el mock responde `409 DUPLICATE_EVENT`.

## Eventos aceptados

| Event type | Productor esperado | Payload minimo esperado |
|---|---|---|
| `OrderCreated` | G5 Pedidos | `userId`, `orderId`, `totalAmount` |
| `PaymentPending` | G6 Pagos | `userId`, `orderId` |
| `PaymentApproved` | G6 Pagos | `userId`, `orderId`, `amount` |
| `PaymentRejected` | G6 Pagos | `userId`, `orderId` |
| `StockRejected` | G7 Inventario | `userId`, `orderId` |
| `ShipmentCreated` | G8 Despacho | `userId`, `orderId` |
| `ShipmentPicking` | G8 Despacho | `userId`, `orderId` |
| `ShipmentOutForDelivery` | G8 Despacho | `userId`, `orderId` |
| `ShipmentDelivered` | G8 Despacho | `userId`, `orderId` |
| `ShipmentFailed` | G8 Despacho | `userId`, `orderId` |

## Mapeo evento a tipo de notificacion

| Evento | Tipo de notificacion |
|---|---|
| `OrderCreated` | `ORDER_CREATED` |
| `PaymentPending` | `PAYMENT_PENDING` |
| `PaymentApproved` | `PAYMENT_APPROVED` |
| `PaymentRejected` | `PAYMENT_REJECTED` |
| `StockRejected` | `STOCK_REJECTED` |
| `ShipmentCreated` | `SHIPMENT_CREATED` |
| `ShipmentPicking` | `SHIPMENT_PICKING` |
| `ShipmentOutForDelivery` | `SHIPMENT_OUT_FOR_DELIVERY` |
| `ShipmentDelivered` | `SHIPMENT_DELIVERED` |
| `ShipmentFailed` | `SHIPMENT_FAILED` |
