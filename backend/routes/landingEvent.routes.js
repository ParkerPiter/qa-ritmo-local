const express = require('express');
const router = express.Router();
const controller = require('../controllers/landingEvent.controller');
const authenticateToken = require('../middleware/auth.Middleware');
const isAdmin = require('../middleware/adminAuth.Middleware');

const adminGuard = [authenticateToken, isAdmin];

// Public — landing pages consume these
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Admin only
router.post('/', adminGuard, controller.create);
router.put('/:id', adminGuard, controller.update);
router.delete('/:id', adminGuard, controller.remove);
router.patch('/:id/featured', adminGuard, controller.toggleFeatured);

module.exports = router;
