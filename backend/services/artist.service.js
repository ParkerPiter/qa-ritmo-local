const { Op } = require('sequelize');
const { User, ArtistProfile, ArtistFollow, Evento } = require('../schemas');

/**
 * Compone la respuesta pública/privada de un perfil de artista a partir del User
 * y su ArtistProfile asociado.
 */
const buildProfilePayload = (user, profile, followers, upcomingShows) => ({
  id: user.id,
  name: user.fullName,
  location: user.location,
  profileImage: user.profileImage,
  bio: profile?.bio ?? null,
  tags: profile?.tags ?? [],
  socialLinks: {
    instagram: profile?.instagram ?? null,
    soundcloud: profile?.soundcloud ?? null
  },
  followers,
  upcomingShows
});

/**
 * Devuelve los eventos futuros (fecha > ahora) en los que el artista es el receptor
 * (partnerUserId), ordenados por fecha ascendente.
 */
const getUpcomingShows = (artistUserId) =>
  Evento.findAll({
    where: {
      partnerUserId: artistUserId,
      fecha: { [Op.gt]: new Date() }
    },
    order: [['fecha', 'ASC']]
  });

/**
 * Garantiza que exista un ArtistProfile vacío ligado al user. Usado al promover a artist.
 * @param {number} userId
 * @returns {Promise<Object>} ArtistProfile
 */
const ensureProfile = async (userId) => {
  const [profile] = await ArtistProfile.findOrCreate({ where: { userId } });
  return profile;
};

/**
 * Crea o actualiza el perfil artístico del usuario autenticado.
 * Escribe fullName/location/profileImage en User y bio/tags/instagram/soundcloud en ArtistProfile.
 * @param {number} userId
 * @param {Object} data - { fullName, location, bio, tags, instagram, soundcloud, profileImage }
 */
const upsertProfile = async (userId, data) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  // Solo actualizamos los campos de User que vienen definidos en el body.
  const userUpdates = {};
  if (data.fullName !== undefined) userUpdates.fullName = data.fullName;
  if (data.location !== undefined) userUpdates.location = data.location;
  if (data.profileImage !== undefined) userUpdates.profileImage = data.profileImage;
  if (Object.keys(userUpdates).length > 0) {
    await user.update(userUpdates);
  }

  const [profile] = await ArtistProfile.findOrCreate({ where: { userId } });

  const profileUpdates = {};
  if (data.bio !== undefined) profileUpdates.bio = data.bio;
  if (data.tags !== undefined) profileUpdates.tags = data.tags;
  if (data.instagram !== undefined) profileUpdates.instagram = data.instagram;
  if (data.soundcloud !== undefined) profileUpdates.soundcloud = data.soundcloud;
  if (Object.keys(profileUpdates).length > 0) {
    await profile.update(profileUpdates);
  }

  return getOwnProfile(userId);
};

/**
 * Devuelve el perfil artístico del usuario autenticado (User + ArtistProfile).
 * @param {number} userId
 */
const getOwnProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: ArtistProfile, as: 'artistProfile' }]
  });
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const followers = await ArtistFollow.count({ where: { artistUserId: userId } });
  const upcomingShows = await getUpcomingShows(userId);

  return buildProfilePayload(
    user,
    user.artistProfile,
    followers,
    upcomingShows.map((e) => ({ id: e.id, titulo: e.titulo, fecha: e.fecha, ubicacion: e.ubicacion }))
  );
};

/**
 * Devuelve el perfil público de un artista por su User id.
 * @param {number} artistUserId
 */
const getPublicProfile = async (artistUserId) => {
  const user = await User.findByPk(artistUserId, {
    include: [{ model: ArtistProfile, as: 'artistProfile' }]
  });

  if (!user || user.rol !== 'artist') {
    const error = new Error('Artista no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const followers = await ArtistFollow.count({ where: { artistUserId } });
  const upcomingShows = await getUpcomingShows(artistUserId);

  return buildProfilePayload(
    user,
    user.artistProfile,
    followers,
    upcomingShows.map((e) => ({ id: e.id, titulo: e.titulo, fecha: e.fecha, ubicacion: e.ubicacion }))
  );
};

/**
 * Valida que el target sea un artista existente. Devuelve el user.
 */
const assertArtistTarget = async (artistUserId) => {
  const artist = await User.findByPk(artistUserId);
  if (!artist || artist.rol !== 'artist') {
    const error = new Error('Artista no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return artist;
};

/**
 * El followerUserId comienza a seguir al artistUserId. Idempotente.
 * @param {number} followerUserId
 * @param {number} artistUserId
 */
const followArtist = async (followerUserId, artistUserId) => {
  if (followerUserId === artistUserId) {
    const error = new Error('No puedes seguirte a ti mismo');
    error.statusCode = 400;
    throw error;
  }

  await assertArtistTarget(artistUserId);

  const [, created] = await ArtistFollow.findOrCreate({
    where: { followerUserId, artistUserId }
  });

  const followers = await ArtistFollow.count({ where: { artistUserId } });
  return { following: true, created, followers };
};

/**
 * El followerUserId deja de seguir al artistUserId.
 * @param {number} followerUserId
 * @param {number} artistUserId
 */
const unfollowArtist = async (followerUserId, artistUserId) => {
  await ArtistFollow.destroy({ where: { followerUserId, artistUserId } });
  const followers = await ArtistFollow.count({ where: { artistUserId } });
  return { following: false, followers };
};

/**
 * Estadísticas agregadas de un artista.
 * @param {number} artistUserId
 * @returns {Promise<{ followers: number, upcomingShows: number, cities: number }>}
 */
const getStats = async (artistUserId) => {
  await assertArtistTarget(artistUserId);

  const followers = await ArtistFollow.count({ where: { artistUserId } });
  const upcoming = await getUpcomingShows(artistUserId);

  const cities = new Set(
    upcoming
      .map((e) => e.ubicacion)
      .filter((u) => u !== null && u !== undefined && u !== '')
  ).size;

  return {
    followers,
    upcomingShows: upcoming.length,
    cities
  };
};

module.exports = {
  ensureProfile,
  upsertProfile,
  getOwnProfile,
  getPublicProfile,
  followArtist,
  unfollowArtist,
  getStats
};
