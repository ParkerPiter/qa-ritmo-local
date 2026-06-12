const { Op } = require('sequelize');
const { Admin, User, SolicitudRol, Order, Evento } = require('../schemas');
const authService = require('./auth.service');
const artistService = require('./artist.service');

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const ROLES_PERMITIDOS = ['client', 'admin', 'partner', 'artist'];

class AdminService {
  /**
   * Crea un nuevo administrador
   * @param {Object} adminData - Datos del administrador
   * @returns {Promise<Object>} Administrador creado
   */
  async createAdmin({ email, password }) {
    const hashedPassword = await authService.hashPassword(password);
    const admin = await Admin.create({ 
      email, 
      password: hashedPassword 
    });
    return authService.sanitizeEntity(admin);
  }

  /**
   * Autentica un administrador
   * @param {string} email - Email del administrador
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Administrador y token
   */
  async authenticateAdmin(email, password) {
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      const error = new Error('Administrador no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await authService.comparePassword(password, admin.password);
    
    if (!isPasswordValid) {
      const error = new Error('Contraseña incorrecta');
      error.statusCode = 400;
      throw error;
    }

    const token = authService.generateToken({ 
      id: admin.id, 
      email: admin.email 
    }, 'admin');

    return {
      token,
      admin: authService.sanitizeEntity(admin)
    };
  }

  /**
   * Obtiene todos los administradores
   * @returns {Promise<Array>} Lista de administradores
   */
  async getAllAdmins() {
    const admins = await Admin.findAll();
    return admins.map(admin => authService.sanitizeEntity(admin));
  }

  /**
   * Obtiene todos los usuarios con campos relevantes para el panel admin
   * @returns {Promise<Array>} Lista de usuarios con id, fullName, email, rol, isActive
   */
  async getUsersForAdmin() {
    return User.findAll({
      attributes: ['id', 'fullName', 'email', 'rol', 'isActive']
    });
  }

  /**
   * Actualiza el rol de un usuario
   * @param {number} userId - ID del usuario
   * @param {string} rol - Nuevo rol ('user', 'admin', 'organizador')
   * @returns {Promise<Object>} Usuario actualizado
   */
  async updateUserRole(userId, rol) {
    if (!ROLES_PERMITIDOS.includes(rol)) {
      const error = new Error(`Rol inválido. Los roles permitidos son: ${ROLES_PERMITIDOS.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await user.update({ rol });

    // Al promover a artist, garantizamos que exista su perfil artístico ligado.
    if (rol === 'artist') {
      await artistService.ensureProfile(user.id);
    }

    return { id: user.id, fullName: user.fullName, email: user.email, rol: user.rol, isActive: user.isActive };
  }

  /**
   * Realiza borrado lógico de un usuario (isActive = false)
   * @param {number} userId - ID del usuario
   */
  async softDeleteUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await user.update({ isActive: false });
  }

  /**
   * Obtiene las solicitudes de cambio de rol
   * @param {string|null} estado - Filtro opcional: 'pending' | 'approved' | 'rejected'
   * @returns {Promise<Array>}
   */
  async getRoleRequests(estado = null) {
    const where = estado ? { estado } : {};
    return SolicitudRol.findAll({
      where,
      include: [{
        model: User,
        as: 'usuario',
        attributes: ['id', 'fullName', 'email', 'rol']
      }],
      order: [['fechaSolicitud', 'DESC']]
    });
  }

  /**
   * Aprueba o rechaza una solicitud de cambio de rol.
   * Si se aprueba, actualiza el rol del usuario automáticamente.
   * @param {number} solicitudId - ID de la solicitud
   * @param {string} decision - 'approved' | 'rejected'
   * @returns {Promise<Object>}
   */
  async resolveRoleRequest(solicitudId, decision) {
    if (!['approved', 'rejected'].includes(decision)) {
      const error = new Error("La decisión debe ser 'approved' o 'rejected'");
      error.statusCode = 400;
      throw error;
    }

    const solicitud = await SolicitudRol.findByPk(solicitudId, {
      include: [{ model: User, as: 'usuario' }]
    });

    if (!solicitud) {
      const error = new Error('Solicitud no encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (solicitud.estado !== 'pending') {
      const error = new Error(`La solicitud ya fue ${solicitud.estado === 'approved' ? 'aprobada' : 'rechazada'}`);
      error.statusCode = 409;
      throw error;
    }

    await solicitud.update({ estado: decision });

    if (decision === 'approved') {
      await solicitud.usuario.update({ rol: solicitud.rolSolicitado });

      // Al aprobar una solicitud de artist, garantizamos su perfil artístico.
      if (solicitud.rolSolicitado === 'artist') {
        await artistService.ensureProfile(solicitud.usuario.id);
      }
    }

    return SolicitudRol.findByPk(solicitudId, {
      include: [{ model: User, as: 'usuario', attributes: ['id', 'fullName', 'email', 'rol'] }]
    });
  }

  /**
   * Lista todas las órdenes reembolsadas con paginación y filtros opcionales.
   * @param {Object} options
   * @param {number} options.page - Página (1-indexada)
   * @param {number} options.pageSize - Items por página
   * @param {string} options.from - Fecha desde (ISO) - filtra por fechaPago
   * @param {string} options.to - Fecha hasta (ISO) - filtra por fechaPago
   * @param {number} options.eventoId - Filtrar por evento
   * @returns {Promise<{ total: number, page: number, pageSize: number, refunds: Array }>}
   */
  async getRefundedOrders({ page = 1, pageSize = 20, from = null, to = null, eventoId = null } = {}) {
    const where = { estado: 'refunded' };
    if (from || to) {
      where.fechaPago = {};
      if (from) where.fechaPago[Op.gte] = new Date(from);
      if (to) where.fechaPago[Op.lte] = new Date(to);
    }
    if (eventoId) where.eventoId = eventoId;

    const offset = (Math.max(1, page) - 1) * pageSize;

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'titulo', 'fecha', 'partnerUserId'],
          include: [{ model: User, as: 'partner', attributes: ['id', 'fullName', 'email'] }]
        },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: pageSize,
      offset
    });

    return {
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
      refunds: rows.map(o => ({
        orderId: o.id,
        estado: o.estado,
        precioTotal: o.precioTotal,
        platformFee: o.platformFee,
        partnerAmount: o.partnerAmount,
        stripePaymentIntentId: o.stripePaymentIntentId,
        stripeTransferId: o.stripeTransferId,
        cantidad: o.cantidad,
        fechaPago: o.fechaPago,
        updatedAt: o.updatedAt,
        cliente: o.user ? { id: o.user.id, fullName: o.user.fullName, email: o.user.email } : null,
        evento: o.evento ? {
          id: o.evento.id,
          titulo: o.evento.titulo,
          fecha: o.evento.fecha,
          partner: o.evento.partner
            ? { id: o.evento.partner.id, fullName: o.evento.partner.fullName, email: o.evento.partner.email }
            : null
        } : null
      }))
    };
  }

  /**
   * Devuelve el detalle de una orden reembolsada por su ID interno.
   * @param {number} orderId
   * @returns {Promise<Object>}
   */
  async getRefundedOrderById(orderId) {
    const order = await Order.findOne({
      where: { id: orderId, estado: 'refunded' },
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [{ model: User, as: 'partner', attributes: ['id', 'fullName', 'email', 'stripeAccountId'] }]
        },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    if (!order) {
      const error = new Error('Reembolso no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Si tenemos Stripe configurado y un payment intent, recuperamos info de Stripe
    let stripeRefundInfo = null;
    if (stripe && order.stripePaymentIntentId) {
      try {
        const refunds = await stripe.refunds.list({
          payment_intent: order.stripePaymentIntentId,
          limit: 10
        });
        stripeRefundInfo = refunds.data.map(r => ({
          id: r.id,
          amount: (r.amount / 100).toFixed(2),
          currency: r.currency,
          status: r.status,
          reason: r.reason,
          created: r.created
        }));
      } catch (err) {
        console.warn(`No se pudo recuperar info de refunds desde Stripe: ${err.message}`);
      }
    }

    return { order, stripeRefundInfo };
  }

  /**
   * Lista las disputas activas desde Stripe.
   * @param {Object} options
   * @param {number} options.limit - Cantidad de resultados (1-100)
   * @param {string} options.starting_after - Cursor para paginación
   * @returns {Promise<Object>}
   */
  async getDisputesFromStripe({ limit = 25, starting_after = null } = {}) {
    if (!stripe) {
      const error = new Error('Servicio de Stripe no configurado');
      error.statusCode = 503;
      throw error;
    }

    const params = { limit: Math.min(Math.max(1, limit), 100) };
    if (starting_after) params.starting_after = starting_after;

    const result = await stripe.disputes.list(params);

    return {
      hasMore: result.has_more,
      disputes: result.data.map(d => ({
        id: d.id,
        amount: (d.amount / 100).toFixed(2),
        currency: d.currency,
        reason: d.reason,
        status: d.status,
        chargeId: d.charge,
        paymentIntentId: d.payment_intent,
        evidenceDueBy: d.evidence_details?.due_by,
        hasEvidence: d.evidence_details?.has_evidence ?? false,
        created: d.created
      }))
    };
  }
}

module.exports = new AdminService();
