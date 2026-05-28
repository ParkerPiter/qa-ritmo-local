const eventoService = require('../services/evento.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');

async function createEvento(req, res) {
  try {
    const {
      titulo, ubicacion, maps, fecha,
      galeriaImagenes, descripcion,
      useful_information, organizadorId, precio
    } = req.body;

    if (!titulo || !fecha || !galeriaImagenes || !descripcion || !organizadorId || precio === undefined) {
      const error = new Error('Faltan campos requeridos: titulo, fecha, galeriaImagenes, descripcion, organizadorId, precio');
      error.statusCode = 400;
      throw error;
    }

    // Si el creador tiene rol 'artist' o 'partner', vincularlo como receptor del evento
    // para habilitar el split de pagos de Stripe Connect
    const partnerUserId = ['artist', 'partner'].includes(req.user?.role) ? req.user.id : null;

    const evento = await eventoService.createEvento(organizadorId, {
      titulo, ubicacion, maps, fecha,
      galeriaImagenes, descripcion,
      useful_information, precio,
      partnerUserId
    });

    handleSuccess(res, { message: 'Evento creado exitosamente', evento }, 201);
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = { createEvento };
