const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Token del flujo "olvidé mi contraseña". Vive lo mismo que el código de 4 dígitos
// que lo origina (ver TOKEN_TTL_MS en controllers/mail.controller.js): el usuario no
// gana tiempo extra por canjear el código, la ventana total sigue siendo de 15 min.
const PASSWORD_RESET_SCOPE = 'password_reset';
const PASSWORD_RESET_TTL_SECONDS = 15 * 60;

class AuthService {
  constructor() {
    // Expuesto para que el endpoint que emite el token pueda informar su vigencia.
    this.passwordResetTtlSeconds = PASSWORD_RESET_TTL_SECONDS;
  }

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
      { expiresIn: '7h' }
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
   * Genera el token del flujo "olvidé mi contraseña".
   * No es un token de sesión: solo sirve para POST /api/user/reset-password.
   * @param {string} email - Email cuya titularidad quedó probada con el código
   * @returns {string} Token JWT con scope password_reset (15 min)
   */
  generatePasswordResetToken(email) {
    return jwt.sign(
      { email, scope: PASSWORD_RESET_SCOPE },
      process.env.JWT_SECRET,
      { expiresIn: PASSWORD_RESET_TTL_SECONDS }
    );
  }

  /**
   * Verifica un token de restablecimiento y devuelve el email al que pertenece.
   * Rechaza los tokens de sesión: exige el scope password_reset, así un JWT de
   * login no sirve para cambiar la contraseña de otra cuenta.
   * @param {string} token - Token recibido del cliente
   * @returns {string} Email autorizado a restablecer
   */
  verifyPasswordResetToken(token) {
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (ex) {
      const expired = ex.name === 'TokenExpiredError';
      const error = new Error(
        expired
          ? 'The reset window has expired. Please request a new code.'
          : 'Invalid reset token. Please request a new code.'
      );
      error.statusCode = 401;
      throw error;
    }

    if (decoded.scope !== PASSWORD_RESET_SCOPE || !decoded.email) {
      const error = new Error('Invalid reset token. Please request a new code.');
      error.statusCode = 401;
      throw error;
    }

    return decoded.email;
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
