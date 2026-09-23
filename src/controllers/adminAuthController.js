const Admin = require('../models/Admin');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

function sendResponse(res, statusCode, admin) {
  res.status(statusCode).json({ success: true, token: signToken(admin.id, 'admin'), admin });
}

const bootstrap = asyncHandler(async (req, res) => {
  const existing = await Admin.exists({});
  if (existing) throw new AppError('An administrator already exists. Use the sign-in page.', 409);
  const { fullName, email, password } = req.body;
  const admin = await Admin.create({ fullName, email, password });
  sendResponse(res, 201, admin);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required.', 400);
  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) throw new AppError('Invalid email or password.', 401);
  if (!admin.isActive) throw new AppError('This administrator account is inactive.', 403);
  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });
  sendResponse(res, 200, admin);
});

const getMe = asyncHandler(async (req, res) => res.json({ success: true, admin: req.admin }));

module.exports = { bootstrap, login, getMe };
