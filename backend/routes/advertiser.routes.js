const express = require('express');
const advertiserRoutes = express.Router();
const advertirserController = require('../controllers/advertiser.controller');
const authenticateToken = require('../middleware/auth.Middleware');

advertiserRoutes.post('/create', advertirserController.createAdvertiser); //Advertiser Route

advertiserRoutes.post('/login', advertirserController.loginAdvertiser, authenticateToken); //Advertiser Route

advertiserRoutes.put('/update', advertirserController.updateAdvertiser); //Advertiser and Admin Route

advertiserRoutes.post('/ads', advertirserController.createAd); // Add an Advertisement 

advertiserRoutes.put('/ads/:id', advertirserController.updateAd); // Update an Advertisement by ID

advertiserRoutes.delete('/ads/:id', advertirserController.deleteAd); // Delete an Advertisement by ID

module.exports = advertiserRoutes;