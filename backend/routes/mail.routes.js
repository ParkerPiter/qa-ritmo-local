const express = require('express');
const verificacion = express.Router();
const mailController = require('../controllers/mail.controller');
const requestAccess = require('./requestAccess.routes');


verificacion.post('/send-token', mailController.sendToken);
verificacion.post('/verify-token', mailController.verifyToken);
verificacion.post('/contact', mailController.formContact);

// Solicitudes de acceso (formulario público + listado admin)
verificacion.use('/request-access', requestAccess);

module.exports = verificacion;