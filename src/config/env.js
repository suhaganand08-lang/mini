const dotenv = require('dotenv');

dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnvironment() {
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }

  if ((process.env.NODE_ENV || 'development') === 'production' && !process.env.ADMIN_API_KEY) {
    throw new Error('ADMIN_API_KEY is required in production.');
  }
}

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  host: process.env.HOST || '0.0.0.0',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: origins,
  adminApiKey: process.env.ADMIN_API_KEY,
  googleMapsServerApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY,
  validateEnvironment,
};
