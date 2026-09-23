const router = require('express').Router();
const { authenticate } = require('../middleware/authenticate');
const { getMyProfile } = require('../controllers/driverController');
const { startJourney, updateLocation, updateSeatAvailability, stopJourney } = require('../controllers/journeyController');

router.get('/me', authenticate, getMyProfile);
router.post('/start', authenticate, startJourney);
router.post('/location', authenticate, updateLocation);
router.patch('/seats', authenticate, updateSeatAvailability);
router.post('/stop', authenticate, stopJourney);

module.exports = router;
