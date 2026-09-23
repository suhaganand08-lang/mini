const router = require('express').Router();
const { authenticate } = require('../middleware/authenticate');
const { registerBus, listBuses, selectAssignedBus, setBusRoute } = require('../controllers/busController');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

router.get('/', listBuses);
router.post('/', authenticateAdmin, registerBus);
router.patch('/:busId/route', authenticateAdmin, setBusRoute);
router.patch('/select-assigned', authenticate, selectAssignedBus);

module.exports = router;
