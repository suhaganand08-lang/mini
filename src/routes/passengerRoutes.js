const router = require('express').Router();
const { getLiveBuses, getNearby, getNetworkOverview, getEtaForStop, getNearbyService, getDirectionsForRoute } = require('../controllers/passengerController');

router.get('/buses', getLiveBuses);
router.get('/nearby', getNearby);
router.get('/network', getNetworkOverview);
router.get('/nearby-service', getNearbyService);
router.get('/routes/:routeId/directions', getDirectionsForRoute);
router.get('/eta/:stopId', getEtaForStop);

module.exports = router;
