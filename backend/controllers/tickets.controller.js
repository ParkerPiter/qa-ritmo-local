const ticketService = require('../services/ticket.service');

/**
 * Valida un ticket escaneado por el staff en la puerta.
 * Body: { token }
 */
const verify = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await ticketService.verifyTicket(token, req.user);

    return res.status(200).json({
      success: true,
      message: 'Acceso concedido. Ticket verificado exitosamente.',
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      valido: false,
      message: error.message || 'Error interno al validar el ticket',
      // En caso de QR ya usado, devolvemos cuándo fue utilizado.
      fechaUso: error.fechaUso || undefined
    });
  }
};

module.exports = {
  verify
};
