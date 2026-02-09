const { Evento, Categoria, Organizador } = require('../schemas');

class EventoService {
  /**
   * Obtiene todos los eventos
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Lista de eventos
   */
  async getAllEventos(filters = {}) {
    const eventos = await Evento.findAll({
      include: [
        {
          model: Categoria,
          as: 'Categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'Organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ],
      ...(filters.where && { where: filters.where })
    });
    return eventos;
  }

  /**
   * Obtiene un evento por ID
   * @param {number} eventoId - ID del evento
   * @returns {Promise<Object>} Evento encontrado
   */
  async getEventoById(eventoId) {
    const evento = await Evento.findByPk(eventoId, {
      include: [
        {
          model: Categoria,
          as: 'Categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'Organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ]
    });

    if (!evento) {
      const error = new Error('Evento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Formatear respuesta con todos los campos
    return {
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      useful_information: evento.useful_information,
      maps: evento.maps,
      ubicacion: evento.ubicacion,
      galeriaImagenes: evento.galeriaImagenes,
      fecha: evento.fecha,
      precio: evento.precio,
      Organizador: evento.Organizador,
      Categorias: evento.Categorias
    };
  }

  /**
   * Crea un nuevo evento
   * @param {number} organizadorId - ID del organizador
   * @param {Object} eventoData - Datos del evento
   * @returns {Promise<Object>} Evento creado
   */
  async createEvento(organizadorId, eventoData) {
    const evento = await Evento.create({
      ...eventoData,
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
    const evento = await Evento.findByPk(eventoId);
    
    if (!evento) {
      const error = new Error('Evento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await evento.update(updateData);
  }

  /**
   * Elimina un evento
   * @param {number} eventoId - ID del evento
   * @returns {Promise<void>}
   */
  async deleteEvento(eventoId) {
    const evento = await Evento.findByPk(eventoId);
    
    if (!evento) {
      const error = new Error('Evento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    await evento.destroy();
  }

  /**
   * Verifica que un evento pertenezca a un organizador
   * @param {number} eventoId - ID del evento
   * @param {number} organizadorId - ID del organizador
   * @returns {Promise<boolean>} True si el evento pertenece al organizador
   */
  async verifyEventOwnership(eventoId, organizadorId) {
    const evento = await Evento.findOne({
      where: { id: eventoId, organizadorId }
    });
    return !!evento;
  }
}

module.exports = new EventoService();
