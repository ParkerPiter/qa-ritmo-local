const express = require('express');
const router = express.Router();

const user = require('./user.routes');
const advertiser = require('./advertiser.routes');
const admin = require('./admin.routes');
const verificacion = require('./mail.routes');

router.use('/user', user);
router.use('/user-advertiser', advertiser);
router.use('/admin-user', admin);
router.use('/verificacion', verificacion)
    

module.exports = router;