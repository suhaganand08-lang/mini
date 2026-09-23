const router = require('express').Router();
const { register, login } = require('../controllers/authController');
const { authenticationRateLimit } = require('../middleware/rateLimits');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

router.post('/register', authenticationRateLimit, authenticateAdmin, register);
router.post('/login', authenticationRateLimit, login);

module.exports = router;
