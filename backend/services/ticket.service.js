const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const dotenv = require('dotenv');
dotenv.config();

const { Ticket, Order, Evento, User } = require('../schemas');

// Opciones de render del QR (alto nivel de corrección de errores para pantallas con brillo bajo).
const QR_OPTIONS = {
  errorCorrectionLevel: 'H',
  margin: 2,
  color: {
    dark: '#1e293b',
    light: '#ffffff'
  }
};

/**
 * Genera los tickets (uno por unidad de `cantidad`) de una orden y sus imágenes QR.
 * Es idempotente: si la orden ya tiene tickets, los retorna sin recrear (el webhook
 * de Stripe puede reenviarse).
 * @param {number} orderId
 * @returns {Promise<{ tickets: Array, qrBuffers: Buffer[], order: Object, evento: Object, user: Object }>}
 */
const generateTicketsForOrder = async (orderId) => {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Evento, as: 'evento' },
        { model: User, as: 'user', attributes: ['id', 'email', 'fullName'] }
      ]
    });

    if (!order) {
      const error = new Error('La orden no existe');
      error.statusCode = 404;
      throw error;
    }

    const evento = order.evento;
    const user = order.user;

    // Guard de idempotencia: si ya hay tickets, no recrear.
    let tickets = await Ticket.findAll({ where: { orderId }, order: [['id', 'ASC']] });

    if (tickets.length === 0) {
      const cantidad = order.cantidad || 1;
      const nuevos = [];
      for (let i = 0; i < cantidad; i++) {
        const token = jwt.sign(
          {
            orderId: order.id,
            eventoId: order.eventoId,
            userId: order.userId,
            nonce: crypto.randomUUID(),
            purpose: 'qr_ticket'
          },
          process.env.JWT_SECRET,
          { expiresIn: '365d' }
        );

        const ticket = await Ticket.create({
          orderId: order.id,
          userId: order.userId,
          eventoId: order.eventoId,
          token,
          usado: false
        });
        nuevos.push(ticket);
      }
      tickets = nuevos;
    }

    // Generar la imagen QR (buffer PNG) de cada ticket a partir de su token.
    const qrBuffers = await Promise.all(
      tickets.map((t) => QRCode.toBuffer(t.token, QR_OPTIONS))
    );

    return { tickets, qrBuffers, order, evento, user };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const err = new Error(`Error to generate tickets: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Valida (escanea) un ticket en la puerta. Marca el ticket como usado de forma atómica.
 * @param {string} token - Token JWT contenido en el QR escaneado.
 * @param {Object} staffUser - req.user del staff que valida (role, id).
 * @returns {Promise<Object>} - Datos del ticket validado.
 */
const verifyTicket = async (token, staffUser) => {
  if (!token) {
    const error = new Error('Token ausente');
    error.statusCode = 400;
    throw error;
  }

  // 1. Validar autenticidad y expiración del JWT.
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (jwtErr) {
    const error = new Error('Código QR inválido, alterado o expirado');
    error.statusCode = 401;
    throw error;
  }

  // 2. Buscar el ticket por token.
  const ticket = await Ticket.findOne({
    where: { token },
    include: [
      { model: Evento, as: 'evento' },
      { model: User, as: 'user', attributes: ['id', 'email', 'fullName'] }
    ]
  });

  if (!ticket) {
    const error = new Error('Ticket no encontrado en el sistema');
    error.statusCode = 404;
    throw error;
  }

  // 3. Autorización por dueño: admin pasa siempre; el resto solo valida tickets de SUS eventos.
  if (staffUser.role !== 'admin' && ticket.evento?.partnerUserId !== staffUser.id) {
    const error = new Error('No tienes permiso para validar tickets de este evento');
    error.statusCode = 403;
    throw error;
  }

  // 4. Marcado atómico anti-doble-escaneo.
  const [affected] = await Ticket.update(
    { usado: true, fechaUso: new Date() },
    { where: { id: ticket.id, usado: false } }
  );

  if (affected === 0) {
    const error = new Error('Este QR ya fue utilizado anteriormente');
    error.statusCode = 400;
    error.fechaUso = ticket.fechaUso;
    throw error;
  }

  return {
    valido: true,
    ticketId: ticket.id,
    evento: {
      id: ticket.evento?.id,
      titulo: ticket.evento?.titulo,
      fecha: ticket.evento?.fecha
    },
    asistente: {
      nombre: ticket.user?.fullName,
      email: ticket.user?.email
    }
  };
};

module.exports = {
  generateTicketsForOrder,
  verifyTicket
};
