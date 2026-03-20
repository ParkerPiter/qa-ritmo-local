const express = require('express');
const artistRoutes = express.Router();
const artistController = require('../controllers/artist.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const isArtist = require('../middleware/artistAuth.Middleware');

const artistGuard = [authenticateToken, isArtist];

artistRoutes.post('/create-event', artistGuard, artistController.createEvento);

module.exports = artistRoutes;
