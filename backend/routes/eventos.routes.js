const express = require('express');
const eventosRouter = express.Router();

const eventosController = require('../controllers/eventos.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const requireRoles = require('../middleware/requireRoles');

// ============ RUTAS PÚBLICAS ============
eventosRouter.get('/', eventosController.getAllEventos);

// ============ RUTAS PROTEGIDAS ============
// Mis eventos — requiere token, cualquier rol.
// IMPORTANTE: debe declararse ANTES de '/:id'. De lo contrario Express
// matchea '/my-events' contra '/:id' y nunca llega a este handler.
eventosRouter.get(
  '/my-events',
  authenticateToken,
  eventosController.getMyEventos
);

// Ruta dinámica por id — va después de las rutas estáticas
eventosRouter.get('/:id', eventosController.getEventoById);

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