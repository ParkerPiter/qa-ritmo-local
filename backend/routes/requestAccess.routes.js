const express = require('express');
const router = express.Router();
const requestAccessController = require('../controllers/requestAccess.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const isAdmin = require('../middleware/adminAuth.Middleware');

// Público — cualquiera puede enviar una solicitud de acceso
router.post('/', requestAccessController.submit);

// Solo admin — ver todas las solicitudes
router.get('/', authenticateToken, isAdmin, requestAccessController.getAll);

module.exports = router;
