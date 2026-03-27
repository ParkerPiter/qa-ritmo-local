const express = require('express');
const adminRoutes = express.Router();
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const organizadorController = require('../controllers/organizador.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const isAdmin = require('../middleware/adminAuth.Middleware');

const adminGuard = [authenticateToken, isAdmin];

// Login (público)
adminRoutes.post('/login', adminController.loginAdminUser);

// Rutas de usuarios
adminRoutes.get('/users', adminGuard, adminController.getUsers);
adminRoutes.put('/users/:id/rol', adminGuard, adminController.updateUserRole);
adminRoutes.delete('/users/:id', adminGuard, adminController.softDeleteUser);
adminRoutes.put('/users/update', adminGuard, userController.updateUser);
adminRoutes.get('/users/find', adminGuard, userController.findUserByEmail);

// Solicitudes de cambio de rol
adminRoutes.get('/role-requests', adminGuard, adminController.getRoleRequests);
adminRoutes.put('/role-requests/:id', adminGuard, adminController.resolveRoleRequest);

// Rutas de organizadores
adminRoutes.get('/organizadores', adminGuard, organizadorController.getAllOrganizadores);
adminRoutes.put('/organizadores/update', adminGuard, organizadorController.updateOrganizador);
adminRoutes.delete('/organizadores/delete', adminGuard, organizadorController.deleteOrganizador);
adminRoutes.get('/organizadores/find', adminGuard, organizadorController.findOrganizadorByEmail);

module.exports = adminRoutes;
