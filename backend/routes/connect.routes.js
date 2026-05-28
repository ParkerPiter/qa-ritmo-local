const express = require('express');
const connectRoutes = express.Router();
const connectController = require('../controllers/connect.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const requireRoles = require('../middleware/requireRoles');

// Iniciar onboarding: crea o reanuda la cuenta Express del partner en Stripe
connectRoutes.post('/onboarding', authenticateToken, connectController.startOnboarding);

// Verificar onboarding: el partner regresa desde Stripe y confirmamos si quedó activo
connectRoutes.get('/onboarding/return', authenticateToken, connectController.verifyOnboarding);

// Estado actual de la cuenta Connect del partner
connectRoutes.get('/status', authenticateToken, connectController.getStatus);

// Historial de pagos/splits recibidos por el artist o partner
connectRoutes.get('/payouts', authenticateToken, requireRoles(['artist', 'partner']), connectController.getPayouts);

module.exports = connectRoutes;
