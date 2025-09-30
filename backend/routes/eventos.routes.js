const express = require('express');
const eventosRouter = express.Router();

const eventosController = require('../controllers/eventos.controller');
const authenticateToken = require('../middleware/auth.Middleware');

eventosRouter.get('/', eventosController.getAllEventos); // Public Route
// eventosRouter.get('/:id', eventosController.getEventoById); // Public
// eventosRouter.get('/category/:categoria', eventosController.getEventosByCategoria); // Public Route
// eventosRouter.get('/organizer/:organizadorId', eventosController.getEventosByOrganizador); // Public Route

module.exports = eventosRouter; 