require('dotenv').config();

const express = require('express');
const supabase = require('./supabaseClient');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;

const VALID_EVENT_TYPES = [
  'OrderCreated',
  'PaymentPending',
  'PaymentApproved',
  'PaymentRejected',
  'StockRejected',
  'ShipmentCreated',
  'ShipmentPicking',
  'ShipmentOutForDelivery',
  'ShipmentDelivered',
  'ShipmentFailed'
];

const EVENT_MAP = {
  OrderCreated: {
    type: 'ORDER_CREATED',
    title: 'Pedido creado exitosamente',
    message: (p) => `Tu pedido #${p.orderId} por $${p.totalAmount} ${p.currency || 'CLP'} fue recibido y esta siendo procesado.`
  },
  PaymentPending: {
    type: 'PAYMENT_PENDING',
    title: 'Pago pendiente',
    message: (p) => `El pago para tu pedido #${p.orderId} esta pendiente de confirmacion.`
  },
  PaymentApproved: {
    type: 'PAYMENT_APPROVED',
    title: 'Pago aprobado',
    message: (p) => `El pago de $${p.amount} ${p.currency || 'CLP'} para tu pedido #${p.orderId} fue aprobado.`
  },
  PaymentRejected: {
    type: 'PAYMENT_REJECTED',
    title: 'Pago rechazado',
    message: (p) => `El pago para tu pedido #${p.orderId} fue rechazado. Motivo: ${p.reason || 'sin especificar'}.`
  },
  StockRejected: {
    type: 'STOCK_REJECTED',
    title: 'Stock no disponible',
    message: (p) => `No fue posible reservar stock para tu pedido #${p.orderId}.`
  },
  ShipmentCreated: {
    type: 'SHIPMENT_CREATED',
    title: 'Pedido en preparacion',
    message: (p) => `Tu pedido #${p.orderId} esta siendo preparado para despacho.`
  },
  ShipmentPicking: {
    type: 'SHIPMENT_PICKING',
    title: 'Pedido siendo empacado',
    message: (p) => `Tu pedido #${p.orderId} esta siendo empacado.`
  },
  ShipmentOutForDelivery: {
    type: 'SHIPMENT_OUT_FOR_DELIVERY',
    title: 'Pedido en camino',
    message: (p) => `Tu pedido #${p.orderId} esta en camino hacia tu direccion.`
  },
  ShipmentDelivered: {
    type: 'SHIPMENT_DELIVERED',
    title: 'Pedido entregado',
    message: (p) => `Tu pedido #${p.orderId} fue entregado exitosamente.`
  },
  ShipmentFailed: {
    type: 'SHIPMENT_FAILED',
    title: 'Problema con el despacho',
    message: (p) => `Hubo un problema con el despacho de tu pedido #${p.orderId}.`
  }
};

const newNotifId = () => `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const newSubId = () => `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function errorResponse(status, code, message, correlationId = null) {
  return {
    timestamp: new Date().toISOString(),
    status,
    code,
    message,
    correlationId
  };
}

function toNotificationResponse(row) {
  return {
    notificationId: row.notification_id,
    eventId: row.event_id,
    eventType: row.event_type,
    producer: row.producer,
    correlationId: row.correlation_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at
  };
}

function toSubscriptionResponse(row) {
  return {
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    platform: row.platform,
    createdAt: row.created_at
  };
}

function applyNotificationFilters(query, filters) {
  const { userId, eventType, type, producer, read, from, to } = filters;

  if (userId) query = query.eq('user_id', userId);
  if (eventType) query = query.eq('event_type', eventType);
  if (type) query = query.eq('type', type);
  if (producer) query = query.eq('producer', producer);
  if (read !== undefined) query = query.eq('read', read === 'true');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  return query;
}

function databaseError(res, correlationId, message = 'No fue posible persistir la notificacion.') {
  return res.status(500).json(errorResponse(500, 'DATABASE_ERROR', message, correlationId));
}

app.post('/notifications/test', async (req, res) => {
  const { eventId, eventType, producer, correlationId, payload } = req.body;

  if (!eventId) {
    return res.status(400).json(errorResponse(
      400,
      'MISSING_EVENT_ID',
      'El campo eventId es obligatorio para garantizar idempotencia.',
      correlationId || null
    ));
  }

  if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
    return res.status(400).json(errorResponse(
      400,
      'INVALID_EVENT_TYPE',
      `El eventType '${eventType}' no es reconocido por este servicio.`,
      correlationId || null
    ));
  }

  if (!payload?.userId) {
    return res.status(422).json(errorResponse(
      422,
      'MISSING_USER_ID',
      'El evento recibido no contiene userId en payload.',
      correlationId || null
    ));
  }

  const { data: existingEvent, error: existingError } = await supabase
    .from('processed_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingError) {
    return databaseError(res, correlationId || null);
  }

  if (existingEvent) {
    return res.status(409).json(errorResponse(
      409,
      'DUPLICATE_EVENT',
      `El evento '${eventId}' ya fue procesado. No se crea notificacion duplicada.`,
      correlationId || null
    ));
  }

  const map = EVENT_MAP[eventType];
  const createdAt = new Date().toISOString();
  const notificationRow = {
    notification_id: newNotifId(),
    event_id: eventId,
    event_type: eventType,
    producer: producer || 'unknown',
    correlation_id: correlationId || null,
    user_id: payload.userId,
    type: map.type,
    title: map.title,
    message: map.message(payload),
    read: false,
    push_sent: false,
    created_at: createdAt
  };

  const { data: insertedNotification, error: notificationError } = await supabase
    .from('notifications')
    .insert(notificationRow)
    .select()
    .single();

  if (notificationError) {
    return databaseError(res, correlationId || null);
  }

  const { error: processedError } = await supabase
    .from('processed_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      producer: producer || 'unknown',
      correlation_id: correlationId || null,
      processed_at: createdAt
    });

  if (processedError) {
    await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', insertedNotification.notification_id);

    return databaseError(res, correlationId || null);
  }

  return res.status(201).json(toNotificationResponse(insertedNotification));
});

app.get('/notifications', async (req, res) => {
  const { page = 1, size = 10 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(size, 10) || 10, 1), 50);
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' });

  query = applyNotificationFilters(query, req.query)
    .order('created_at', { ascending: false })
    .range(start, end);

  const { data, error, count } = await query;

  if (error) {
    return databaseError(res, req.headers['x-correlation-id'] || null, 'No fue posible consultar las notificaciones.');
  }

  let unreadQuery = supabase
    .from('notifications')
    .select('notification_id', { count: 'exact', head: true })
    .eq('read', false);

  unreadQuery = applyNotificationFilters(unreadQuery, req.query)
    .eq('read', false);

  const { count: unreadCount, error: unreadError } = await unreadQuery;

  if (unreadError) {
    return databaseError(res, req.headers['x-correlation-id'] || null, 'No fue posible consultar las notificaciones.');
  }

  return res.status(200).json({
    data: (data || []).map(toNotificationResponse),
    pagination: {
      page: pageNum,
      size: pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    },
    unreadCount: unreadCount || 0
  });
});

app.get('/notifications/stats', async (req, res) => {
  const { from, to } = req.query;

  let query = supabase
    .from('notifications')
    .select('producer,event_type,read,created_at');

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;

  if (error) {
    return databaseError(res, req.headers['x-correlation-id'] || null, 'No fue posible consultar estadisticas.');
  }

  const byProducer = {};
  const byEventType = {};
  const rows = data || [];

  rows.forEach((notification) => {
    byProducer[notification.producer] = (byProducer[notification.producer] || 0) + 1;
    byEventType[notification.event_type] = (byEventType[notification.event_type] || 0) + 1;
  });

  return res.status(200).json({
    total: rows.length,
    unread: rows.filter((notification) => !notification.read).length,
    read: rows.filter((notification) => notification.read).length,
    byProducer,
    byEventType,
    generatedAt: new Date().toISOString()
  });
});

app.patch('/notifications/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params;
  const correlationId = req.headers['x-correlation-id'] || null;

  const { data: existingNotification, error: findError } = await supabase
    .from('notifications')
    .select('*')
    .eq('notification_id', notificationId)
    .maybeSingle();

  if (findError) {
    return databaseError(res, correlationId, 'No fue posible consultar la notificacion.');
  }

  if (!existingNotification) {
    return res.status(404).json(errorResponse(
      404,
      'NOTIFICATION_NOT_FOUND',
      `No existe una notificacion con id '${notificationId}'.`,
      correlationId
    ));
  }

  const { data: updatedNotification, error: updateError } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('notification_id', notificationId)
    .select()
    .single();

  if (updateError) {
    return databaseError(res, correlationId, 'No fue posible actualizar la notificacion.');
  }

  return res.status(200).json(toNotificationResponse(updatedNotification));
});

app.post('/notifications/subscriptions', async (req, res) => {
  const { userId, platform, subscription } = req.body;
  const correlationId = req.headers['x-correlation-id'] || null;

  if (!userId) {
    return res.status(422).json(errorResponse(
      422,
      'MISSING_USER_ID',
      'El campo userId es obligatorio para registrar una suscripcion.',
      correlationId
    ));
  }

  if (!subscription) {
    return res.status(400).json(errorResponse(
      400,
      'INVALID_REQUEST',
      'El campo subscription es requerido.',
      correlationId
    ));
  }

  const { data: existingSubscription, error: findError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    return databaseError(res, correlationId, 'No fue posible consultar la suscripcion.');
  }

  if (existingSubscription) {
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('push_subscriptions')
      .update({
        platform: platform || 'web',
        subscription,
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', existingSubscription.subscription_id)
      .select()
      .single();

    if (updateError) {
      return databaseError(res, correlationId, 'No fue posible guardar la suscripcion.');
    }

    return res.status(201).json(toSubscriptionResponse(updatedSubscription));
  }

  const { data: insertedSubscription, error: insertError } = await supabase
    .from('push_subscriptions')
    .insert({
      subscription_id: newSubId(),
      user_id: userId,
      platform: platform || 'web',
      subscription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    return databaseError(res, correlationId, 'No fue posible guardar la suscripcion.');
  }

  return res.status(201).json(toSubscriptionResponse(insertedSubscription));
});

app.get('/', (req, res) => {
  res.json({
    service: 'G9 - Notification Service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /',
      'POST /notifications/test',
      'GET  /notifications',
      'GET  /notifications/stats',
      'PATCH /notifications/:notificationId/read',
      'POST /notifications/subscriptions'
    ]
  });
});

// Iniciar listeners de RabbitMQ
const { connectG5 } = require('./listeners/g5.listener');
connectG5();

app.listen(PORT, () => {
  console.log(`Notification Service corriendo en http://localhost:${PORT}`);
  console.log('   POST  /notifications/test');
  console.log('   GET   /notifications');
  console.log('   GET   /notifications/stats');
  console.log('   PATCH /notifications/:notificationId/read');
  console.log('   POST  /notifications/subscriptions');
});
