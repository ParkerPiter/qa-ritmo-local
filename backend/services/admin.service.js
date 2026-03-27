const { Admin, User, SolicitudRol } = require('../schemas');
const authService = require('./auth.service');

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
    }

    return SolicitudRol.findByPk(solicitudId, {
      include: [{ model: User, as: 'usuario', attributes: ['id', 'fullName', 'email', 'rol'] }]
    });
  }
}

module.exports = new AdminService();
