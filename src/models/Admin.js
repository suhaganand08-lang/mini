const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.'],
  },
  password: { type: String, required: true, minlength: 12, select: false },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true, versionKey: false });

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

adminSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

adminSchema.set('toJSON', { transform: (document, returned) => { delete returned.password; return returned; } });

module.exports = mongoose.model('Admin', adminSchema);
