const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthService {
  /**
   * Genera un token JWT
   * @param {Object} payload - Datos del usuario a incluir en el token
   * @param {string} role - Rol del usuario (user, admin, organizador, anunciante)
   * @returns {string} Token JWT
   */
  generateToken(payload, role = 'user') {
    return jwt.sign(
      { ...payload, role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Verifica un token JWT
   * @param {string} token - Token a verificar
   * @returns {Object} Payload decodificado
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  /**
   * Hashea una contraseña
   * @param {string} password - Contraseña en texto plano
   * @returns {Promise<string>} Contraseña hasheada
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compara una contraseña con su hash
   * @param {string} password - Contraseña en texto plano
   * @param {string} hash - Hash almacenado
   * @returns {Promise<boolean>}
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Sanitiza los datos del usuario (elimina información sensible)
   * @param {Object} entity - Entidad a sanitizar
   * @returns {Object} Entidad sanitizada
   */
  sanitizeEntity(entity) {
    if (!entity) return null;
    const entityJSON = entity.toJSON ? entity.toJSON() : entity;
    const { password, ...sanitized } = entityJSON;
    return sanitized;
  }
}

module.exports = new AuthService();
