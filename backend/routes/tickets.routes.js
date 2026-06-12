const express = require('express');
const ticketsRoutes = express.Router();
const authenticateToken = require('../middleware/auth.Middleware');
const requireRoles = require('../middleware/requireRoles');
const ticketsController = require('../controllers/tickets.controller');

// Validación de QR por staff autenticado del evento (o admin).
ticketsRoutes.post(
  '/verify',
  authenticateToken,
  requireRoles(['admin', 'artist', 'partner', 'venue']),
  ticketsController.verify
);

module.exports = ticketsRoutes;
