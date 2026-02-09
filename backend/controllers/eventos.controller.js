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

module.exports = { getAllEventos, getEventoById };
