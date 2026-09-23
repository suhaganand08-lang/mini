const crypto = require('crypto');
const { adminApiKey } = require('../config/env');
const AppError = require('../utils/AppError');

function requireAdminKey(req, res, next) {
  if (!adminApiKey) return next();

  const providedKey = req.headers['x-admin-api-key'];
  const expected = Buffer.from(adminApiKey);
  const provided = Buffer.from(typeof providedKey === 'string' ? providedKey : '');
  const matches = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  if (!matches) return next(new AppError('A valid administrator API key is required.', 403));
  return next();
}

module.exports = { requireAdminKey };
