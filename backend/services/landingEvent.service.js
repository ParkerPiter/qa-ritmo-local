const { LandingEvent } = require('../schemas');

const MAX_FEATURED = 3;

async function getAllLandingEvents(filters = {}) {
  const where = {};
  if (filters.ciudad) where.ciudad = filters.ciudad;
  if (filters.featured !== undefined) where.featured = filters.featured;

  return LandingEvent.findAll({
    where,
    order: [['fecha', 'ASC'], ['hora', 'ASC']],
  });
}

async function getLandingEventById(id) {
  const event = await LandingEvent.findByPk(id);
  if (!event) {
    const err = new Error('Landing event not found');
    err.statusCode = 404;
    throw err;
  }
  return event;
}

async function createLandingEvent(data) {
  return LandingEvent.create(data);
}

async function updateLandingEvent(id, data) {
  const event = await getLandingEventById(id);
  return event.update(data);
}

async function deleteLandingEvent(id) {
  const event = await getLandingEventById(id);
  await event.destroy();
}

async function toggleFeatured(id) {
  const event = await getLandingEventById(id);

  if (!event.featured) {
    const featuredCount = await LandingEvent.count({
      where: { ciudad: event.ciudad, featured: true },
    });
    if (featuredCount >= MAX_FEATURED) {
      const err = new Error(`Ya hay ${MAX_FEATURED} eventos destacados para esta ciudad. Quita uno antes de añadir otro.`);
      err.statusCode = 400;
      throw err;
    }
  }

  return event.update({ featured: !event.featured });
}

module.exports = {
  getAllLandingEvents,
  getLandingEventById,
  createLandingEvent,
  updateLandingEvent,
  deleteLandingEvent,
  toggleFeatured,
};
