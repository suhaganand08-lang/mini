const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) throw new AppError('Administrator authentication is required.', 401);

  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), jwtSecret);
  } catch {
    throw new AppError('Your administrator session is invalid or has expired.', 401);
  }
  if (payload.role !== 'admin') throw new AppError('Administrator access is required.', 403);

  const admin = await Admin.findById(payload.sub);
  if (!admin?.isActive) throw new AppError('This administrator account is unavailable.', 401);
  req.admin = admin;
  next();
});

module.exports = { authenticateAdmin };
