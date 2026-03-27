const eventoService = require('../services/evento.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');

// Get all eventos
const getAllEventos = async (req, res) => {
  try {
    const eventos = await eventoService.getAllEventos();
    handleSuccess(res, { eventos });
  } catch (error) {
    handleError(res, error);
  }
};

// Get evento by id
const getEventoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      const error = new Error('ID del evento es requerido');
      error.statusCode = 400;
      throw error;
    }

    const evento = await eventoService.getEventoById(id);
    handleSuccess(res, { evento });
  } catch (error) {
    handleError(res, error);
  }
};

// Crear evento — accesible por admin, artist y partner
const createEvento = async (req, res) => {
  try {
    const {
      titulo, descripcion, fecha, precio,
      ubicacion, maps, galeriaImagenes,
      useful_information, organizadorId,
      categoriasIds, maxTicketsPorUsuario
    } = req.body;

    if (!titulo || !descripcion || !fecha || precio === undefined || !galeriaImagenes) {
      const error = new Error('Faltan campos requeridos: titulo, descripcion, fecha, precio, galeriaImagenes');
      error.statusCode = 400;
      throw error;
    }

    // Si el creador es partner, vincular el evento a su cuenta para el split de Stripe
    const partnerUserId = req.user.role === 'partner' ? req.user.id : null;

    const evento = await eventoService.createEvento(organizadorId || null, {
      titulo, descripcion, fecha, precio,
      ubicacion, maps, galeriaImagenes,
      useful_information,
      partnerUserId,
      categoriasIds,
      maxTicketsPorUsuario: maxTicketsPorUsuario || null
    });

    handleSuccess(res, { message: 'Evento creado exitosamente', evento }, 201);
  } catch (error) {
    handleError(res, error);
  }
};

// Editar evento — accesible por admin, artist y partner
const updateEvento = async (req, res) => {
  try {
    const { id } = req.params;

    const camposPermitidos = [
      'titulo', 'descripcion', 'fecha', 'precio',
      'ubicacion', 'maps', 'galeriaImagenes',
      'useful_information', 'maxTicketsPorUsuario'
    ];

    const updateData = {};
    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        updateData[campo] = req.body[campo];
      }
    });

    if (Object.keys(updateData).length === 0) {
      const error = new Error('No se proporcionaron campos para actualizar');
      error.statusCode = 400;
      throw error;
    }

    await eventoService.updateEvento(id, updateData);
    const evento = await eventoService.getEventoById(id);

    handleSuccess(res, { message: 'Evento actualizado exitosamente', evento });
  } catch (error) {
    handleError(res, error);
  }
};

// Eliminar evento — solo admin
const deleteEvento = async (req, res) => {
  try {
    const { id } = req.params;
    await eventoService.deleteEvento(id);
    handleSuccess(res, { message: 'Evento eliminado exitosamente' });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getAllEventos, getEventoById, createEvento, updateEvento, deleteEvento };
