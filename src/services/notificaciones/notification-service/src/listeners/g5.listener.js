const amqp = require('amqplib');
const { createNotification } = require('../services/notification.service');

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const EXCHANGE = 'payments.events';
const QUEUE = 'g9-service';
const ROUTING_KEY = 'OrderCreated';

async function connectG5() {
  if (!RABBITMQ_URL) {
    console.error('❌ RABBITMQ_URL no configurada');
    return;
  }

  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    console.log('✅ G5 RabbitMQ consumer conectado — escuchando OrderCreated');

    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        console.log('📨 Evento OrderCreated recibido de G5:', payload);

        if (!payload.userId) {
          console.error('❌ Evento sin userId — rechazando');
          channel.nack(msg, false, false);
          return;
        }

        await createNotification({
          eventId: payload.eventId || `g5-${Date.now()}`,
          eventType: 'OrderCreated',
          producer: 'order-service',
          correlationId: payload.correlationId || null,
          payload
        });

        channel.ack(msg);
        console.log('✅ Notificación OrderCreated creada');

      } catch (err) {
        console.error('❌ Error procesando evento G5:', err);
        channel.nack(msg, false, false);
      }
    });

    conn.on('error', (err) => {
      console.error('❌ Conexión RabbitMQ G5 cerrada:', err);
      setTimeout(connectG5, 5000);
    });

  } catch (err) {
    console.error('❌ Error conectando RabbitMQ G5:', err);
    setTimeout(connectG5, 5000);
  }
}

module.exports = { connectG5 };