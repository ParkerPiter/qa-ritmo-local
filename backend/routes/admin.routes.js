const express = require('express');
const adminRoutes = express.Router();
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const organizadorController = require('../controllers/organizador.controller');
const authenticateToken = require('../middleware/auth.Middleware');

// Rutas para usuarios
adminRoutes.get('/users', userController.getAllUsers);
adminRoutes.put('/users/update', userController.updateUser);
adminRoutes.delete('/users/delete', userController.deleteUser);
adminRoutes.get('/users/find', userController.findUserByEmail);

// Rutas para organizadores
adminRoutes.get('/organizadores', organizadorController.getAllOrganizadores);
adminRoutes.put('/organizadores/update', organizadorController.updateOrganizador);
adminRoutes.delete('/organizadores/delete', organizadorController.deleteOrganizador);
adminRoutes.get('/organizadores/find', organizadorController.findOrganizadorByEmail);

// Ruta para el login del admin
adminRoutes.post('/login', adminController.loginAdminUser, authenticateToken);

module.exports = adminRoutes;


