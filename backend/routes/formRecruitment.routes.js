const express = require('express');
const router = express.Router();
const formRecruitmentController = require('../controllers/formRecruitment.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const isAdmin = require('../middleware/adminAuth.Middleware');

// Público — cualquiera puede unirse a la lista
router.post('/', formRecruitmentController.submit);

// Solo admin — ver todas las inscripciones
router.get('/', authenticateToken, isAdmin, formRecruitmentController.getAll);

module.exports = router;
