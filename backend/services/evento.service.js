const { Evento, Categoria, Organizador, Sequelize } = require('../schemas');
const { Op } = Sequelize;

class EventoService {
  /**
   * Obtiene todos los eventos cuya venta está activa al momento de la consulta.
   * - Si fechaInicioVenta es null → sin restricción de inicio
   * - Si fechaFinVenta es null → sin restricción de fin
   * @returns {Promise<Array>} Lista de eventos visibles
   */
  async getAllEventos() {
    const now = new Date();

    const eventos = await Evento.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { fechaInicioVenta: null },
              { fechaInicioVenta: { [Op.lte]: now } }
            ]
          },
          {
            [Op.or]: [
              { fechaFinVenta: null },
              { fechaFinVenta: { [Op.gte]: now } }
            ]
          }
        ]
      },
      include: [
        {
          model: Categoria,
          as: 'categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ]
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
          as: 'categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'organizador',
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
      organizador: evento.organizador,
      categorias: evento.categorias
    };
  }

  /**
   * Crea un nuevo evento
   * @param {number|null} organizadorId - ID del organizador (opcional para artists/partners)
   * @param {Object} eventoData - Datos del evento (puede incluir categoriasIds y partnerUserId)
   * @returns {Promise<Object>} Evento creado con sus relaciones
   */
  async createEvento(organizadorId, eventoData) {
    const { categoriasIds, ...camposEvento } = eventoData;

    const evento = await Evento.create({
      ...camposEvento,
      organizadorId
    });

    // Vincular categorías si se proporcionaron (por nombre)
    if (categoriasIds?.length) {
      const categorias = await Categoria.findAll({ where: { nombre: categoriasIds } });
      await evento.addCategorias(categorias);
    }

    // Devolver evento con sus relaciones
    return Evento.findByPk(evento.id, {
      include: [
        {
          model: Categoria,
          as: 'categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ]
    });
  }

  /**
   * Obtiene todos los eventos subidos por un usuario (partnerUserId)
   * @param {number} userId - ID del usuario autenticado
   * @returns {Promise<Array>} Lista de eventos del usuario
   */
  async getEventosByUser(userId) {
    const eventos = await Evento.findAll({
      where: { partnerUserId: userId },
      include: [
        {
          model: Categoria,
          as: 'categorias',
          attributes: ['id', 'nombre', 'tipo'],
          through: { attributes: [] }
        },
        {
          model: Organizador,
          as: 'organizador',
          attributes: ['id', 'nombreCompleto', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!eventos.length) {
      const error = new Error('No tienes eventos creados');
      error.statusCode = 404;
      throw error;
    }

    return eventos;
  }

  /**
   * Actualiza un evento
   * @param {number} eventoId - ID del evento
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<void>}
   */
  async updateEvento(eventoId, updateData) {
    const { categoriasIds, ...camposEvento } = updateData;

    const evento = await Evento.findByPk(eventoId);

    if (!evento) {
      const error = new Error('Evento no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (Object.keys(camposEvento).length) {
      await evento.update(camposEvento);
    }

    if (categoriasIds !== undefined) {
      const categorias = await Categoria.findAll({ where: { nombre: categoriasIds } });
      await evento.setCategorias(categorias);
    }
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
