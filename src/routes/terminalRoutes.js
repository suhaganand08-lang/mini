const router = require('express').Router();
const { authenticate } = require('../middleware/authenticate');
const { createTerminal, listTerminals, checkTerminal } = require('../controllers/terminalController');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');

router.route('/').get(listTerminals).post(authenticateAdmin, createTerminal);
router.post('/detect', authenticate, checkTerminal);

module.exports = router;
