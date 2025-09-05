const express = require('express');
const userRoutes = express.Router();
const userController = require('../controllers/user.controller');
const authenticateToken = require('../middleware/auth.Middleware');

userRoutes.post('/create', userController.createUser); //User Route

userRoutes.post('/login', userController.loginUser , authenticateToken); //User Route

userRoutes.post('/login-google', userController.loginWithGoogle , authenticateToken); //User Route

userRoutes.put('/update', userController.updateUser); //User and Admin Route

module.exports = userRoutes;