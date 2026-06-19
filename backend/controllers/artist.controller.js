const eventoService = require('../services/evento.service');
const artistService = require('../services/artist.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');

/**
 * Parsea y valida el :id de artista de la ruta. Lanza 400 si no es un entero válido.
 */
function parseArtistId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('ID de artista inválido');
    error.statusCode = 400;
    throw error;
  }
  return id;
}

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

    // Si el creador tiene rol 'artist', 'partner' o 'promoter', vincularlo como receptor del evento
    // para habilitar el split de pagos de Stripe Connect
    const partnerUserId = ['artist', 'partner', 'promoter'].includes(req.user?.role) ? req.user.id : null;

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

/**
 * Crea o actualiza el perfil artístico del usuario autenticado.
 * Body: { fullName, location, bio, tags[], instagram, soundcloud, profileImage }
 */
async function upsertProfile(req, res) {
  try {
    const { fullName, location, bio, tags, instagram, soundcloud, profileImage } = req.body;
    const profile = await artistService.upsertProfile(req.user.id, {
      fullName, location, bio, tags, instagram, soundcloud, profileImage
    });
    handleSuccess(res, { message: 'Perfil actualizado exitosamente', profile });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Devuelve el perfil artístico del usuario autenticado.
 */
async function getMyProfile(req, res) {
  try {
    const profile = await artistService.getOwnProfile(req.user.id);
    handleSuccess(res, { profile });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Devuelve el perfil público de un artista por su User id.
 */
async function getPublicProfile(req, res) {
  try {
    const artistId = parseArtistId(req.params.id);
    const profile = await artistService.getPublicProfile(artistId);
    handleSuccess(res, { profile });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * El usuario autenticado sigue al artista :id.
 */
async function follow(req, res) {
  try {
    const artistId = parseArtistId(req.params.id);
    const result = await artistService.followArtist(req.user.id, artistId);
    handleSuccess(res, { message: 'Ahora sigues a este artista', ...result });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * El usuario autenticado deja de seguir al artista :id.
 */
async function unfollow(req, res) {
  try {
    const artistId = parseArtistId(req.params.id);
    const result = await artistService.unfollowArtist(req.user.id, artistId);
    handleSuccess(res, { message: 'Dejaste de seguir a este artista', ...result });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Estadísticas públicas del artista :id: { followers, upcomingShows, cities }.
 */
async function getStats(req, res) {
  try {
    const artistId = parseArtistId(req.params.id);
    const stats = await artistService.getStats(artistId);
    handleSuccess(res, { stats });
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = {
  createEvento,
  upsertProfile,
  getMyProfile,
  getPublicProfile,
  follow,
  unfollow,
  getStats
};
