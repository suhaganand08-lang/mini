const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function signToken(subjectId, role = 'driver') {
  return jwt.sign({ sub: subjectId, role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

module.exports = { signToken };
