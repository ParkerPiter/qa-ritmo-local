const { Organizador, Evento, Categoria } = require('../schemas');
const authService = require('./auth.service');

class OrganizadorService {
  /**
   * Crea un nuevo organizador
   * @param {Object} organizadorData - Datos del organizador
   * @returns {Promise<Object>} Organizador creado
   */
  async createOrganizador({ email, phone, password }) {
    const hashedPassword = await authService.hashPassword(password);
    const organizador = await Organizador.create({ 
      email, 
      password: hashedPassword, 
      phone 
    });
    return authService.sanitizeEntity(organizador);
  }

  /**
   * Autentica un organizador
   * @param {string} email - Email del organizador
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Organizador y token
   */
  async authenticateOrganizador(email, password) {
    const organizador = await Organizador.findOne({ where: { email } });
    
    if (!organizador) {
      const error = new Error('Organizador no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await authService.comparePassword(password, organizador.password);
    
    if (!isPasswordValid) {
      const error = new Error('Contraseña incorrecta');
      error.statusCode = 400;
      throw error;
    }

    const token = authService.generateToken({ 
      id: organizador.id, 
      email: organizador.email 
    }, 'organizador');

    return {
      token,
      organizador: authService.sanitizeEntity(organizador)
    };
  }

  /**
   * Actualiza un organizador
   * @param {string} email - Email del organizador
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<void>}
   */
  async updateOrganizador(email, { password, newPassword, confirmNewPassword }) {
    const organizador = await Organizador.findOne({ where: { email } });
    
    if (!organizador) {
      const error = new Error('Organizador no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (newPassword && confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        const error = new Error('Las contraseñas no coinciden');
        error.statusCode = 400;
        throw error;
      }
      const hashedPassword = await authService.hashPassword(newPassword);
      await organizador.update({ password: hashedPassword });
    }
  }

  /**
   * Elimina un organizador
   * @param {string} email - Email del organizador
   * @returns {Promise<void>}
   */
  async deleteOrganizador(email) {
    const organizador = await Organizador.findOne({ where: { email } });
    
    if (!organizador) {
      const error = new Error('Organizador no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await organizador.destroy();
  }

  /**
   * Busca un organizador por email
   * @param {string} email - Email del organizador
   * @returns {Promise<Object>} Organizador encontrado
   */
  async findByEmail(email) {
    const organizador = await Organizador.findOne({ where: { email } });
    
    if (!organizador) {
      const error = new Error('Organizador no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return authService.sanitizeEntity(organizador);
  }

  /**
   * Obtiene todos los organizadores
   * @returns {Promise<Array>} Lista de organizadores
   */
  async getAllOrganizadores() {
    const organizadores = await Organizador.findAll();
    return organizadores.map(org => authService.sanitizeEntity(org));
  }

  /**
   * Crea un nuevo evento
   * @param {number} organizadorId - ID del organizador
   * @param {Object} eventoData - Datos del evento
   * @returns {Promise<Object>} Evento creado
   */
  async createEvento(organizadorId, eventoData) {
    const { titulo, descripcion, precio, fecha, ubicacion, galeriaImagenes, categoryId } = eventoData;
    
    const evento = await Evento.create({
      titulo,
      descripcion,
      precio,
      galeriaImagenes,
      fecha,
      ubicacion,
      categoryId,
      organizadorId
    });

    return evento;
  }

  /**
   * Actualiza un evento
   * @param {number} eventoId - ID del evento
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<void>}
   */
  async updateEvento(eventoId, updateData) {
    const { titulo, descripcion, precio, fecha, ubicacion, categoryId } = updateData;
    
    await Evento.update(
      { titulo, descripcion, precio, fecha, ubicacion, categoryId },
      { where: { id: eventoId } }
    );
  }

  /**
   * Elimina un evento
   * @param {number} eventoId - ID del evento
   * @returns {Promise<void>}
   */
  async deleteEvento(eventoId) {
    await Evento.destroy({ where: { id: eventoId } });
  }

  /**
   * Obtiene los eventos de un organizador
   * @param {number} organizadorId - ID del organizador
   * @returns {Promise<Array>} Lista de eventos
   */
  async getEventosByOrganizador(organizadorId) {
    return Evento.findAll({
      where: { organizadorId },
      include: [
        {
          model: Categoria,
          as: 'Categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        }
      ]
    });
  }
}

module.exports = new OrganizadorService();
