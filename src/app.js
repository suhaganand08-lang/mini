const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { corsOrigins, environment } = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');
const busRoutes = require('./routes/busRoutes');
const routeRoutes = require('./routes/routeRoutes');
const busStopRoutes = require('./routes/busStopRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const passengerRoutes = require('./routes/passengerRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { requestId } = require('./middleware/requestId');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

console.log('CORS_ORIGINS:', corsOrigins);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(requestId);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(environment === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Smart Transport API is running.' });
});
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Transport API v1 is running.',
    health: '/api/v1/health',
  });
});
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/buses', busRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/bus-stops', busStopRoutes);
app.use('/api/v1/terminals', terminalRoutes);
app.use('/api/v1/passenger', passengerRoutes);
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
