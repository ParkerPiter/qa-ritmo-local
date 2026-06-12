const express = require('express');
const router = express.Router();

const user = require('./user.routes');
const organizador = require('./organizador.routes');
const admin = require('./admin.routes');
const verificacion = require('./mail.routes');
const eventos = require('./eventos.routes');
const payments = require('./payments.routes');
const artist = require('./artist.routes');
const connect = require('./connect.routes');
const landingEvents = require('./landingEvent.routes');
const formRecruitment = require('./formRecruitment.routes');
const cloudinary = require('./cloudinary.routes');
const tickets = require('./tickets.routes');

router.use('/user', user);
router.use('/organizador', organizador);
router.use('/admin-user', admin);
router.use('/verificacion', verificacion);
router.use('/eventos', eventos);
router.use('/payments', payments);
router.use('/artist', artist);
router.use('/connect', connect);
router.use('/landing-events', landingEvents);
router.use('/recruitment', formRecruitment);
router.use('/cloudinary', cloudinary);
router.use('/tickets', tickets);

module.exports = router;