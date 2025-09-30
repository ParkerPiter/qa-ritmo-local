const express = require('express');
const organizadorRoutes = express.Router();
const organizadorController = require('../controllers/organizador.controller');
const authenticateToken = require('../middleware/auth.Middleware');

organizadorRoutes.post('/create', organizadorController.createOrganizador);

organizadorRoutes.post('/login', organizadorController.loginOrganizador, authenticateToken);

organizadorRoutes.put('/update', organizadorController.updateOrganizador);

organizadorRoutes.post('/events', organizadorController.createEvento);

organizadorRoutes.put('/events/:id', organizadorController.updateEvento);

organizadorRoutes.delete('/events/:id', organizadorController.deleteEvento);

module.exports = organizadorRoutes;