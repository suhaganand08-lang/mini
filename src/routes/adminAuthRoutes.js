const router = require('express').Router();
const { authenticationRateLimit } = require('../middleware/rateLimits');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { requireAdminKey } = require('../middleware/requireAdminKey');
const { bootstrap, login, getMe } = require('../controllers/adminAuthController');

router.post('/bootstrap', authenticationRateLimit, requireAdminKey, bootstrap);
router.post('/login', authenticationRateLimit, login);
router.get('/me', authenticateAdmin, getMe);

module.exports = router;
