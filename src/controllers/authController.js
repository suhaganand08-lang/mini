const Driver = require('../models/Driver');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

function sendAuthResponse(res, statusCode, driver) {
  const token = signToken(driver._id.toString());
  res.status(statusCode).json({
    success: true,
    token,
    driver,
  });
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : email;
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : phone;

  const existingDriver = await Driver.findOne({
    $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
  });
  if (existingDriver) {
    throw new AppError('A driver already exists with this email or phone number.', 409);
  }

  const driver = await Driver.create({ fullName, email: normalizedEmail, phone: normalizedPhone, password });
  sendAuthResponse(res, 201, driver);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const driver = await Driver.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!driver || !(await driver.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }
  if (!driver.isActive) {
    throw new AppError('This driver account is inactive.', 403);
  }

  driver.lastLoginAt = new Date();
  await driver.save({ validateBeforeSave: false });
  sendAuthResponse(res, 200, driver);
});

module.exports = { register, login };
