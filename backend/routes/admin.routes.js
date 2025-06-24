const express = require('express');
const adminRoutes = express.Router();
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const advertirserController = require('../controllers/advertiser.controller');
const authenticateToken = require('../middleware/auth.Middleware');

adminRoutes.get('/', userController.getAllUsers);
adminRoutes.get('/', advertirserController.getAllAdvertisers);

adminRoutes.post('/login', adminController.loginAdminUser, authenticateToken);

adminRoutes.put('/update', userController.updateUser);
adminRoutes.put('/update', advertirserController.updateAdvertiser);

adminRoutes.delete('/delete', userController.deleteUser);
adminRoutes.delete('/delete', advertirserController.deleteAdvertiser);

adminRoutes.get('/find', userController.findUserByEmail);
adminRoutes.get('/find', advertirserController.findUserByEmail);

module.exports = adminRoutes;


