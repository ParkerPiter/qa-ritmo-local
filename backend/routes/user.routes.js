const express = require('express');
const userRoutes = express.Router();
const userController = require('../controllers/user.controller');
const authenticateToken = require('../middleware/auth.Middleware');

// ============ RUTAS PÚBLICAS ============
userRoutes.post('/create', userController.createUser);
userRoutes.post('/login', userController.loginUser);
userRoutes.post('/login-google', userController.loginWithGoogle);

// ============ RUTAS PROTEGIDAS (requieren autenticación) ============

// Perfil del usuario
userRoutes.get('/profile', authenticateToken, userController.getProfile);
userRoutes.put('/profile', authenticateToken, userController.updateProfile);

// Actualizar contraseña
userRoutes.put('/update', authenticateToken, userController.updateUser);

// Favoritos
userRoutes.get('/favorites', authenticateToken, userController.getFavorites);
userRoutes.post('/favorites', authenticateToken, userController.addFavorite);
userRoutes.delete('/favorites/:eventoId', authenticateToken, userController.removeFavorite);

// Pedidos
userRoutes.get('/orders', authenticateToken, userController.getOrders);

// ============ RUTAS ADMIN (deberían tener middleware de rol admin) ============
userRoutes.get('/all', userController.getAllUsers);
userRoutes.get('/find', userController.findUserByEmail);
userRoutes.delete('/delete', userController.deleteUser);

module.exports = userRoutes;