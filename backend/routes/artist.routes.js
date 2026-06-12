const express = require('express');
const artistRoutes = express.Router();
const artistController = require('../controllers/artist.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const isArtist = require('../middleware/artistAuth.Middleware');

const artistGuard = [authenticateToken, isArtist];

// Perfil del artista autenticado (rutas estáticas antes de '/:id').
artistRoutes.post('/profile', artistGuard, artistController.upsertProfile);
artistRoutes.get('/profile', artistGuard, artistController.getMyProfile);

artistRoutes.post('/create-event', artistGuard, artistController.createEvento);

// Perfil público y estadísticas (sin auth).
artistRoutes.get('/:id', artistController.getPublicProfile);
artistRoutes.get('/:id/stats', artistController.getStats);

// Seguir / dejar de seguir (requiere usuario autenticado).
artistRoutes.post('/:id/follow', authenticateToken, artistController.follow);
artistRoutes.delete('/:id/follow', authenticateToken, artistController.unfollow);

module.exports = artistRoutes;
