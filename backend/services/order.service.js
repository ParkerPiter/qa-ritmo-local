const { Order, User, Evento, Categoria, Organizador } = require('../schemas');

/**
 * Crear una nueva orden en estado pending
 * @param {Object} orderData - Datos de la orden
 * @returns {Promise<Object>} - Orden creada
 */
const createOrder = async ({ userId, eventoId, cantidad, precioTotal, stripeSessionId }) => {
  try {
    // Validar que el evento existe
    const evento = await Evento.findByPk(eventoId);
    if (!evento) {
      const error = new Error('El evento no existe');
      error.statusCode = 404;
      throw error;
    }

    // Validar que el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('El usuario no existe');
      error.statusCode = 404;
      throw error;
    }

    // Crear la orden en estado pending
    const order = await Order.create({
      userId,
      eventoId,
      cantidad,
      precioTotal,
      estado: 'pending',
      stripePaymentIntentId: stripeSessionId
    });

    // Obtener la orden con sus relaciones
    const orderWithDetails = await Order.findByPk(order.id, {
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [
            {
              model: Organizador,
              as: 'organizador',
              attributes: ['id', 'nombreCompleto', 'email']
            },
            {
              model: Categoria,
              as: 'categorias',
              attributes: ['id', 'nombre'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    return orderWithDetails;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const err = new Error(`Error to create order: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Confirmar una orden después del pago exitoso
 * @param {string} stripeSessionId - ID de la sesión de Stripe
 * @param {string} paymentIntentId - ID del payment intent (opcional)
 * @returns {Promise<Object>} - Orden confirmada
 */
const confirmOrder = async (stripeSessionId, paymentIntentId = null) => {
  try {
    // Buscar la orden por el stripePaymentIntentId (puede ser session o payment_intent)
    const order = await Order.findOne({
      where: { stripePaymentIntentId: stripeSessionId }
    });

    if (!order) {
      const error = new Error('Don\'t found the order associated with the payment');
      error.statusCode = 404;
      throw error;
    }

    // Verificar que la orden esté en estado pending
    if (order.estado !== 'pending') {
      console.log(`⚠️ Orden ${order.id} was processed with status: ${order.estado}`);
      // No es un error, simplemente ya fue procesada
      return order;
    }

    // Actualizar la orden a "paid" y establecer la fecha de pago
    order.estado = 'paid';
    order.fechaPago = new Date();
    
    // Si se proporcionó un paymentIntentId diferente, actualizarlo
    if (paymentIntentId && paymentIntentId !== stripeSessionId) {
      order.stripePaymentIntentId = paymentIntentId;
    }
    
    await order.save();

    console.log(`✅ Orden ${order.id} confirmed as paid`);

    // Obtener la orden con sus relaciones
    const orderWithDetails = await Order.findByPk(order.id, {
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [
            {
              model: Organizador,
              as: 'organizador',
              attributes: ['id', 'nombre', 'email']
            },
            {
              model: Categoria,
              as: 'categorias',
              attributes: ['id', 'nombre'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    return orderWithDetails;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const err = new Error(`Error to confirm order: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Cancelar una orden
 * @param {number} orderId - ID de la orden
 * @param {number} userId - ID del usuario (opcional, para validación)
 * @returns {Promise<Object>} - Orden cancelada
 */
const cancelOrder = async (orderId, userId = null) => {
  try {
    const order = await Order.findByPk(orderId);

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // Verificar que la orden pertenece al usuario (si se proporciona userId)
    if (userId && order.userId !== userId) {
      const error = new Error('You do not have permission to cancel this order');
      error.statusCode = 403;
      throw error;
    }

    // Solo se pueden cancelar órdenes en estado pending
    if (order.estado !== 'pending') {
      const error = new Error(`Cannot cancel an order with status: ${order.estado}`);
      error.statusCode = 400;
      throw error;
    }

    order.estado = 'cancel';
    await order.save();

    console.log(`❌ Order ${order.id} canceled`);

    const orderWithDetails = await Order.findByPk(order.id, {
      include: [
        {
          model: Evento,
          as: 'evento'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    return orderWithDetails;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const err = new Error(`Error to cancel order: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Obtener una orden por ID
 * @param {number} orderId - ID de la orden
 * @param {number} userId - ID del usuario (para validación)
 * @returns {Promise<Object>} - Orden encontrada
 */
const getOrderById = async (orderId, userId = null) => {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [
            {
              model: Organizador,
              as: 'organizador',
              attributes: ['id', 'nombre', 'email']
            },
            {
              model: Categoria,
              as: 'categorias',
              attributes: ['id', 'nombre'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // Verificar que la orden pertenece al usuario (si se proporciona userId)
    if (userId && order.userId !== userId) {
      const error = new Error('You do not have permission to view this order');
      error.statusCode = 403;
      throw error;
    }

    return order;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const err = new Error(`Error to get order: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Obtener una orden por Stripe Session ID
 * @param {string} stripeSessionId - ID de la sesión de Stripe
 * @returns {Promise<Object>} - Orden encontrada
 */
const getOrderByStripeSessionId = async (stripeSessionId) => {
  try {
    const order = await Order.findOne({
      where: { stripePaymentIntentId: stripeSessionId },
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [
            {
              model: Organizador,
              as: 'organizador',
              attributes: ['id', 'nombre', 'email']
            },
            {
              model: Categoria,
              as: 'categorias',
              attributes: ['id', 'nombre'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    return order;
  } catch (error) {
    const err = new Error(`Error to get order by session ID: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Obtener una orden por Payment Intent ID
 * @param {string} paymentIntentId - ID del payment intent de Stripe
 * @returns {Promise<Object>} - Orden encontrada
 */
const getOrderByPaymentIntentId = async (paymentIntentId) => {
  try {
    const order = await Order.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      include: [
        {
          model: Evento,
          as: 'evento'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    return order;
  } catch (error) {
    const err = new Error(`Error to get order by payment intent: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Obtener todas las órdenes de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} estado - Estado de la orden (opcional)
 * @returns {Promise<Array>} - Lista de órdenes
 */
const getUserOrders = async (userId, estado = null) => {
  try {
    const whereClause = { userId };
    if (estado) {
      whereClause.estado = estado;
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [
            {
              model: Organizador,
              as: 'organizador',
              attributes: ['id', 'nombre', 'email']
            },
            {
              model: Categoria,
              as: 'categorias',
              attributes: ['id', 'nombre'],
              through: { attributes: [] }
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return orders;
  } catch (error) {
    const err = new Error(`Error to get user orders: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Procesar reembolso de una orden
 * @param {number} orderId - ID de la orden
 * @param {number} userId - ID del usuario (opcional, para validación)
 * @returns {Promise<Object>} - Orden reembolsada
 */
const refundOrder = async (orderId, userId = null) => {
  try {
    const order = await Order.findByPk(orderId);

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // Verificar que la orden pertenece al usuario (si se proporciona userId)
    if (userId && order.userId !== userId) {
      const error = new Error('You do not have permission to request a refund for this order');
      error.statusCode = 403;
      throw error;
    }

    // Solo se pueden reembolsar órdenes pagadas
    if (order.estado !== 'paid') {
      const error = new Error(`Cannot refund an order with status: ${order.estado}`);
      error.statusCode = 400;
      throw error;
    }

    order.estado = 'refunded';
    await order.save();

    console.log(`💰 Order ${order.id} refunded`);

    const orderWithDetails = await Order.findByPk(order.id, {
      include: [
        {
          model: Evento,
          as: 'evento'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'fullName']
        }
      ]
    });

    return orderWithDetails;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const err = new Error(`Error to process refund: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  createOrder,
  confirmOrder,
  cancelOrder,
  getOrderById,
  getOrderByStripeSessionId,
  getOrderByPaymentIntentId,
  getUserOrders,
  refundOrder
};
