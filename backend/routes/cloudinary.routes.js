const express = require('express');
const router = express.Router();
const { generateSignature } = require('../controllers/cloudinary.controller');
const authenticateToken = require('../middleware/auth.Middleware');

router.post('/sign', authenticateToken, generateSignature);

module.exports = router;
