const { Anunciante, Anuncio, Categoria } = require('../schemas');
const authService = require('./auth.service');

class AdvertiserService {
  /**
   * Crea un nuevo anunciante
   * @param {Object} advertiserData - Datos del anunciante
   * @returns {Promise<Object>} Anunciante creado
   */
  async createAdvertiser({ email, phone, password }) {
    const hashedPassword = await authService.hashPassword(password);
    const anunciante = await Anunciante.create({ 
      email, 
      password: hashedPassword, 
      phone 
    });
    return authService.sanitizeEntity(anunciante);
  }

  /**
   * Autentica un anunciante
   * @param {string} email - Email del anunciante
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Anunciante y token
   */
  async authenticateAdvertiser(email, password) {
    const anunciante = await Anunciante.findOne({ where: { email } });
    
    if (!anunciante) {
      const error = new Error('Anunciante no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await authService.comparePassword(password, anunciante.password);
    
    if (!isPasswordValid) {
      const error = new Error('Contraseña incorrecta');
      error.statusCode = 400;
      throw error;
    }

    const token = authService.generateToken({ 
      id: anunciante.id, 
      email: anunciante.email 
    }, 'anunciante');

    return {
      token,
      anunciante: authService.sanitizeEntity(anunciante)
    };
  }

  /**
   * Actualiza un anunciante
   * @param {string} email - Email del anunciante
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<void>}
   */
  async updateAdvertiser(email, { password, newPassword, confirmNewPassword }) {
    const anunciante = await Anunciante.findOne({ where: { email } });
    
    if (!anunciante) {
      const error = new Error('Anunciante no encontrado');
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
      await anunciante.update({ password: hashedPassword });
    }
  }

  /**
   * Elimina un anunciante
   * @param {string} email - Email del anunciante
   * @returns {Promise<void>}
   */
  async deleteAdvertiser(email) {
    const anunciante = await Anunciante.findOne({ where: { email } });
    
    if (!anunciante) {
      const error = new Error('Anunciante no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await anunciante.destroy();
  }

  /**
   * Busca un anunciante por email
   * @param {string} email - Email del anunciante
   * @returns {Promise<Object>} Anunciante encontrado
   */
  async findByEmail(email) {
    const anunciante = await Anunciante.findOne({ where: { email } });
    
    if (!anunciante) {
      const error = new Error('Anunciante no encontrado');
      error.statusCode = 404;
      throw error;
    }

    return authService.sanitizeEntity(anunciante);
  }

  /**
   * Obtiene todos los anunciantes
   * @returns {Promise<Array>} Lista de anunciantes
   */
  async getAllAdvertisers() {
    const anunciantes = await Anunciante.findAll();
    return anunciantes.map(anunciante => authService.sanitizeEntity(anunciante));
  }

  /**
   * Crea un nuevo anuncio
   * @param {number} advertiserId - ID del anunciante
   * @param {Object} adData - Datos del anuncio
   * @returns {Promise<Object>} Anuncio creado
   */
  async createAd(advertiserId, adData) {
    const { titulo, descripcion, precio, disponibilidad, ubicacion, garantia, galeriaImagenes, categoryId } = adData;
    
    const anuncio = await Anuncio.create({
      titulo,
      descripcion,
      precio,
      galeriaImagenes,
      disponibilidad,
      ubicacion,
      garantia,
      categoryId,
      advertiserId
    });

    return anuncio;
  }

  /**
   * Actualiza un anuncio
   * @param {number} adId - ID del anuncio
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<void>}
   */
  async updateAd(adId, updateData) {
    const { titulo, descripcion, precio, disponibilidad, ubicacion, garantia, categoryId } = updateData;
    
    await Anuncio.update(
      { titulo, descripcion, precio, disponibilidad, ubicacion, garantia, categoryId },
      { where: { id: adId } }
    );
  }

  /**
   * Elimina un anuncio
   * @param {number} adId - ID del anuncio
   * @returns {Promise<void>}
   */
  async deleteAd(adId) {
    await Anuncio.destroy({ where: { id: adId } });
  }

  /**
   * Obtiene los anuncios de un anunciante
   * @param {number} advertiserId - ID del anunciante
   * @returns {Promise<Array>} Lista de anuncios
   */
  async getAdsByAdvertiser(advertiserId) {
    return Anuncio.findAll({
      where: { advertiserId },
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

module.exports = new AdvertiserService();
