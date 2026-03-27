const express = require('express');
const eventosRouter = express.Router();

const eventosController = require('../controllers/eventos.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const requireRoles = require('../middleware/requireRoles');

// ============ RUTAS PÚBLICAS ============
eventosRouter.get('/', eventosController.getAllEventos);
eventosRouter.get('/:id', eventosController.getEventoById);

// ============ RUTAS PROTEGIDAS ============
// Solo admin, artist y partner pueden crear y editar eventos
eventosRouter.post(
  '/',
  authenticateToken,
  requireRoles(['admin', 'artist', 'partner']),
  eventosController.createEvento
);

eventosRouter.put(
  '/:id',
  authenticateToken,
  requireRoles(['admin', 'artist', 'partner']),
  eventosController.updateEvento
);

eventosRouter.delete(
  '/:id',
  authenticateToken,
  requireRoles(['admin']),
  eventosController.deleteEvento
);

module.exports = eventosRouter;