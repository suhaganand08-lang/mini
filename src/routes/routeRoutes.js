const router = require('express').Router();
const { createRoute, listRoutes, getRoute, setRouteStops } = require('../controllers/routeController');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

router.route('/').get(listRoutes).post(authenticateAdmin, createRoute);
router.route('/:routeId').get(getRoute);
router.patch('/:routeId/stops', authenticateAdmin, setRouteStops);

module.exports = router;
