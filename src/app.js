require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Base de datos en memoria (mock)
let notifications = [];
let processedEvents = new Set();
let pushSubscriptions = [];
let subCounter = 1;

// ── Tipos de evento válidos ──────────────────────────
const VALID_EVENT_TYPES = [
  'OrderCreated', 'PaymentPending', 'PaymentApproved',
  'PaymentRejected', 'StockRejected', 'ShipmentCreated',
  'ShipmentPicking', 'ShipmentOutForDelivery',
  'ShipmentDelivered', 'ShipmentFailed'
];

// ── Mapa evento → notificación ───────────────────────
const EVENT_MAP = {
  OrderCreated:           { type: 'ORDER_CREATED',             title: 'Pedido creado exitosamente',    message: (p) => `Tu pedido #${p.orderId} por $${p.totalAmount} ${p.currency || 'CLP'} fue recibido y está siendo procesado.` },
  PaymentPending:         { type: 'PAYMENT_PENDING',           title: 'Pago pendiente',                message: (p) => `El pago para tu pedido #${p.orderId} está pendiente de confirmación.` },
  PaymentApproved:        { type: 'PAYMENT_APPROVED',          title: 'Pago aprobado',                 message: (p) => `El pago de $${p.amount} ${p.currency || 'CLP'} para tu pedido #${p.orderId} fue aprobado.` },
  PaymentRejected:        { type: 'PAYMENT_REJECTED',          title: 'Pago rechazado',                message: (p) => `El pago para tu pedido #${p.orderId} fue rechazado. Motivo: ${p.reason || 'sin especificar'}.` },
  StockRejected:          { type: 'STOCK_REJECTED',            title: 'Stock no disponible',           message: (p) => `No fue posible reservar stock para tu pedido #${p.orderId}.` },
  ShipmentCreated:        { type: 'SHIPMENT_CREATED',          title: 'Pedido en preparación',         message: (p) => `Tu pedido #${p.orderId} está siendo preparado para despacho.` },
  ShipmentPicking:        { type: 'SHIPMENT_PICKING',          title: 'Pedido siendo empacado',        message: (p) => `Tu pedido #${p.orderId} está siendo empacado.` },
  ShipmentOutForDelivery: { type: 'SHIPMENT_OUT_FOR_DELIVERY', title: 'Pedido en camino',              message: (p) => `Tu pedido #${p.orderId} está en camino hacia tu dirección.` },
  ShipmentDelivered:      { type: 'SHIPMENT_DELIVERED',        title: 'Pedido entregado',              message: (p) => `Tu pedido #${p.orderId} fue entregado exitosamente.` },
  ShipmentFailed:         { type: 'SHIPMENT_FAILED',           title: 'Problema con el despacho',      message: (p) => `Hubo un problema con el despacho de tu pedido #${p.orderId}.` },
};

// ── Helper IDs ───────────────────────────────────────
let notifCounter = 1;
const newNotifId = () => `NOTIF-${String(notifCounter++).padStart(4, '0')}`;
const newSubId   = () => `SUB-${String(subCounter++).padStart(4, '0')}`;

// ════════════════════════════════════════════════════
// POST /notifications/test  — simular evento
// ════════════════════════════════════════════════════
app.post('/notifications/test', (req, res) => {
  const { eventId, eventType, producer, correlationId, payload } = req.body;

  if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(), status: 400,
      code: 'INVALID_EVENT_TYPE',
      message: `El eventType '${eventType}' no es reconocido por este servicio.`,
      correlationId: correlationId || null
    });
  }

  if (!payload?.userId) {
    return res.status(422).json({
      timestamp: new Date().toISOString(), status: 422,
      code: 'MISSING_USER_ID',
      message: 'El evento recibido no contiene userId en payload.',
      correlationId: correlationId || null
    });
  }

  if (processedEvents.has(eventId)) {
    return res.status(409).json({
      timestamp: new Date().toISOString(), status: 409,
      code: 'DUPLICATE_EVENT',
      message: `El evento '${eventId}' ya fue procesado. No se crea notificación duplicada.`,
      correlationId: correlationId || null
    });
  }

  const map = EVENT_MAP[eventType];
  const notification = {
    notificationId: newNotifId(),
    eventId, eventType,
    producer: producer || 'unknown',
    correlationId: correlationId || null,
    userId: payload.userId,
    type: map.type,
    title: map.title,
    message: map.message(payload),
    read: false,
    createdAt: new Date().toISOString()
  };

  notifications.push(notification);
  processedEvents.add(eventId);

  return res.status(201).json(notification);
});

// ════════════════════════════════════════════════════
// GET /notifications
// ════════════════════════════════════════════════════
app.get('/notifications', (req, res) => {
  const { userId, eventType, type, producer, read, from, to, page = 1, size = 10 } = req.query;

  let result = [...notifications];

  if (userId)    result = result.filter(n => n.userId === userId);
  if (eventType) result = result.filter(n => n.eventType === eventType);
  if (type)      result = result.filter(n => n.type === type);
  if (producer)  result = result.filter(n => n.producer === producer);
  if (read !== undefined) result = result.filter(n => n.read === (read === 'true'));
  if (from)      result = result.filter(n => new Date(n.createdAt) >= new Date(from));
  if (to)        result = result.filter(n => new Date(n.createdAt) <= new Date(to));

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pageNum  = parseInt(page);
  const pageSize = Math.min(parseInt(size), 50);
  const total    = result.length;
  const start    = (pageNum - 1) * pageSize;
  const data     = result.slice(start, start + pageSize);
  const unreadCount = result.filter(n => !n.read).length;

  return res.status(200).json({
    data,
    pagination: { page: pageNum, size: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    unreadCount
  });
});

// ════════════════════════════════════════════════════
// GET /notifications/stats
// ════════════════════════════════════════════════════
app.get('/notifications/stats', (req, res) => {
  const { from, to } = req.query;

  let result = [...notifications];
  if (from) result = result.filter(n => new Date(n.createdAt) >= new Date(from));
  if (to)   result = result.filter(n => new Date(n.createdAt) <= new Date(to));

  const byProducer  = {};
  const byEventType = {};

  result.forEach(n => {
    byProducer[n.producer]   = (byProducer[n.producer]   || 0) + 1;
    byEventType[n.eventType] = (byEventType[n.eventType] || 0) + 1;
  });

  return res.status(200).json({
    total: result.length,
    unread: result.filter(n => !n.read).length,
    read:   result.filter(n =>  n.read).length,
    byProducer,
    byEventType,
    generatedAt: new Date().toISOString()
  });
});

// ════════════════════════════════════════════════════
// PATCH /notifications/:id/read
// ════════════════════════════════════════════════════
app.patch('/notifications/:notificationId/read', (req, res) => {
  const { notificationId } = req.params;
  const notif = notifications.find(n => n.notificationId === notificationId);

  if (!notif) {
    return res.status(404).json({
      timestamp: new Date().toISOString(), status: 404,
      code: 'NOTIFICATION_NOT_FOUND',
      message: `No existe una notificación con id '${notificationId}'.`,
      correlationId: req.headers['x-correlation-id'] || null
    });
  }

  notif.read = true;
  return res.status(200).json(notif);
});

// ════════════════════════════════════════════════════
// POST /notifications/subscriptions — Web Push (G1)
// ════════════════════════════════════════════════════
app.post('/notifications/subscriptions', (req, res) => {
  const { userId, platform, subscription } = req.body;

  if (!userId) {
    return res.status(422).json({
      timestamp: new Date().toISOString(), status: 422,
      code: 'MISSING_USER_ID',
      message: 'El campo userId es obligatorio para registrar una suscripción.',
      correlationId: req.headers['x-correlation-id'] || null
    });
  }

  if (!subscription) {
    return res.status(400).json({
      timestamp: new Date().toISOString(), status: 400,
      code: 'INVALID_REQUEST',
      message: 'El campo subscription es requerido.',
      correlationId: req.headers['x-correlation-id'] || null
    });
  }

  const newSub = {
    subscriptionId: newSubId(),
    userId,
    platform: platform || 'web',
    subscription,
    createdAt: new Date().toISOString()
  };

  // Si ya existe, reemplazar
  const index = pushSubscriptions.findIndex(s => s.userId === userId);
  if (index >= 0) {
    pushSubscriptions[index] = newSub;
  } else {
    pushSubscriptions.push(newSub);
  }

  return res.status(201).json({
    subscriptionId: newSub.subscriptionId,
    userId: newSub.userId,
    platform: newSub.platform,
    createdAt: newSub.createdAt
  });
});


app.get('/', (req, res) => {
  res.json({
    service: 'G9 — Notification Service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /notifications',
      'GET  /notifications/stats',
      'POST /notifications/test',
      'POST /notifications/subscriptions',
      'PATCH /notifications/:id/read'
    ]
  });
});


// ── Arrancar servidor ────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Notification Service corriendo en http://localhost:${PORT}`);
  console.log(`   POST  /notifications/test`);
  console.log(`   GET   /notifications`);
  console.log(`   GET   /notifications/stats`);
  console.log(`   PATCH /notifications/:id/read`);
  console.log(`   POST  /notifications/subscriptions`);
});