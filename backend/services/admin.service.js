const { Admin } = require('../schemas');
const authService = require('./auth.service');

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
}

module.exports = new AdminService();
