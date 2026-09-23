const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  const status = databaseReady ? 200 : 503;

  res.status(status).json({
    success: databaseReady,
    service: 'smart-transport-server',
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
