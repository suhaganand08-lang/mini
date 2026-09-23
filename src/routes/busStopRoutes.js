const router = require('express').Router();
const { createBusStop, listBusStops } = require('../controllers/busStopController');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

router.route('/').get(listBusStops).post(authenticateAdmin, createBusStop);

module.exports = router;
