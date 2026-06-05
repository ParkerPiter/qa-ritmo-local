const landingEventService = require('../services/landingEvent.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');

async function getAll(req, res) {
  try {
    const { ciudad, featured } = req.query;
    const filters = {};
    if (ciudad) filters.ciudad = ciudad;
    if (featured !== undefined) filters.featured = featured === 'true';

    const events = await landingEventService.getAllLandingEvents(filters);
    handleSuccess(res, { message: 'Landing events retrieved', landingEvents: events });
  } catch (error) {
    handleError(res, error);
  }
}

async function getById(req, res) {
  try {
    const event = await landingEventService.getLandingEventById(req.params.id);
    handleSuccess(res, { message: 'Landing event retrieved', landingEvent: event });
  } catch (error) {
    handleError(res, error);
  }
}

async function create(req, res) {
  try {
    const { titulo, artistas, fecha, hora, lugar, descripcion, precio, ticketUrl, imagen, ciudad } = req.body;

    if (!titulo || !fecha || !lugar || !ciudad) {
      const err = new Error('titulo, fecha, lugar y ciudad son requeridos');
      err.statusCode = 400;
      throw err;
    }

    // Si el evento es gratis (precio 0 o sin precio) ticketUrl es opcional;
    // si tiene precio, ticketUrl es obligatorio.
    const esGratis = precio === undefined || precio === null || precio === '' || Number(precio) === 0;
    if (!esGratis && !ticketUrl) {
      const err = new Error('ticketUrl es requerido cuando el evento tiene precio');
      err.statusCode = 400;
      throw err;
    }

    const event = await landingEventService.createLandingEvent({
      titulo, artistas, fecha, hora, lugar, descripcion, precio, ticketUrl, imagen, ciudad,
    });
    handleSuccess(res, { message: 'Landing event created', landingEvent: event }, 201);
  } catch (error) {
    handleError(res, error);
  }
}

async function update(req, res) {
  try {
    const event = await landingEventService.updateLandingEvent(req.params.id, req.body);
    handleSuccess(res, { message: 'Landing event updated', landingEvent: event });
  } catch (error) {
    handleError(res, error);
  }
}

async function remove(req, res) {
  try {
    await landingEventService.deleteLandingEvent(req.params.id);
    handleSuccess(res, { message: 'Landing event deleted' });
  } catch (error) {
    handleError(res, error);
  }
}

async function toggleFeatured(req, res) {
  try {
    const event = await landingEventService.toggleFeatured(req.params.id);
    handleSuccess(res, { message: 'Featured status updated', landingEvent: event });
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = { getAll, getById, create, update, remove, toggleFeatured };
