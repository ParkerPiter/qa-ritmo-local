const express = require('express');
const paymentsRoutes = express.Router();
const authenticateToken = require('../middleware/auth.Middleware');
const paymentsController = require('../controllers/payments.controller');

// Rutas de pagos
paymentsRoutes.post('/create-checkout', authenticateToken, paymentsController.createCheckout);
paymentsRoutes.get('/success', paymentsController.handleSuccess);
paymentsRoutes.get('/cancel', paymentsController.handleCancel);

// Webhook de Stripe (NO requiere autenticación, Stripe envía la firma en el header)
// NOTA: Esta ruta debe recibir raw body, configurado en index.js
paymentsRoutes.post('/webhook', paymentsController.handleWebhook);

module.exports = paymentsRoutes;
