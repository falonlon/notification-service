const supabase = require('../db/supabaseClient');

const EVENT_MAP = {
  OrderCreated:           { type: 'ORDER_CREATED',            title: 'Pedido creado exitosamente',    message: (p) => `Tu pedido #${p.orderId} por $${p.totalAmount} ${p.currency || 'CLP'} fue recibido y está siendo procesado.` },
  PaymentPending:         { type: 'PAYMENT_PENDING',          title: 'Pago pendiente',                message: (p) => `El pago para tu pedido #${p.orderId} está pendiente de confirmación.` },
  PaymentApproved:        { type: 'PAYMENT_APPROVED',         title: 'Pago aprobado',                 message: (p) => `El pago de $${p.amount} ${p.currency || 'CLP'} para tu pedido #${p.orderId} fue aprobado.` },
  PaymentRejected:        { type: 'PAYMENT_REJECTED',         title: 'Pago rechazado',                message: (p) => `El pago para tu pedido #${p.orderId} fue rechazado. Motivo: ${p.reason || 'sin especificar'}.` },
  StockRejected:          { type: 'STOCK_REJECTED',           title: 'Stock no disponible',           message: (p) => `No fue posible reservar stock para tu pedido #${p.orderId}.` },
  ShipmentCreated:        { type: 'SHIPMENT_CREATED',         title: 'Pedido en preparación',         message: (p) => `Tu pedido #${p.orderId} está siendo preparado para despacho.` },
  ShipmentPicking:        { type: 'SHIPMENT_PICKING',         title: 'Pedido siendo empacado',        message: (p) => `Tu pedido #${p.orderId} está siendo empacado.` },
  ShipmentOutForDelivery: { type: 'SHIPMENT_OUT_FOR_DELIVERY',title: 'Pedido en camino',              message: (p) => `Tu pedido #${p.orderId} está en camino hacia tu dirección.` },
  ShipmentDelivered:      { type: 'SHIPMENT_DELIVERED',       title: 'Pedido entregado',              message: (p) => `Tu pedido #${p.orderId} fue entregado exitosamente.` },
  ShipmentFailed:         { type: 'SHIPMENT_FAILED',          title: 'Problema con el despacho',      message: (p) => `Hubo un problema con el despacho de tu pedido #${p.orderId}.` },
};

async function createNotification({ eventId, eventType, producer, correlationId, payload }) {
  // Verificar idempotencia
  const { data: existing } = await supabase
    .from('processed_events')
    .select('event_id')
    .eq('event_id', eventId)
    .single();

  if (existing) {
    console.log(`⚠️ Evento duplicado ignorado: ${eventId}`);
    return { duplicate: true };
  }

  if (!payload?.userId) {
    throw new Error('MISSING_USER_ID');
  }

  const map = EVENT_MAP[eventType];
  if (!map) {
    throw new Error('INVALID_EVENT_TYPE');
  }

  const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  // Insertar notificación
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      notification_id: notificationId,
      event_id: eventId,
      event_type: eventType,
      producer: producer || 'unknown',
      correlation_id: correlationId || null,
      user_id: payload.userId,
      type: map.type,
      title: map.title,
      message: map.message(payload),
      read: false,
      push_sent: false
    })
    .select()
    .single();

  if (error) throw error;

  // Registrar en processed_events
  await supabase
    .from('processed_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      producer: producer || 'unknown'
    });

  return { duplicate: false, notification: data };
}

module.exports = { createNotification };