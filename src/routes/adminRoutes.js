const router = require('express').Router();
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { dashboard, listDrivers, createDriver, assignDriverBus } = require('../controllers/adminController');

router.use(authenticateAdmin);
router.get('/dashboard', dashboard);
router.route('/drivers').get(listDrivers).post(createDriver);
router.patch('/drivers/:driverId/assignment', assignDriverBus);

module.exports = router;
