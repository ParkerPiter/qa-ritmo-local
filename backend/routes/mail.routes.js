const express = require('express');
const verificacion = express.Router();
const mailController = require('../controllers/mail.controller');


verificacion.post('/send-token', mailController.sendToken);
verificacion.post('/verify-token', mailController.verifyToken);
verificacion.post('/contact', mailController.formContact);

module.exports = verificacion;