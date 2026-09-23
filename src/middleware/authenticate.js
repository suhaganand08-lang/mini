const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new AppError('Authentication is required.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), jwtSecret);
  } catch (error) {
    throw new AppError('Your session is invalid or has expired.', 401);
  }

  if (payload.role !== 'driver') {
    throw new AppError('You are not authorized to access this resource.', 403);
  }

  const driver = await Driver.findById(payload.sub);
  if (!driver || !driver.isActive) {
    throw new AppError('This driver account is unavailable.', 401);
  }

  req.driver = driver;
  next();
});

module.exports = { authenticate };
