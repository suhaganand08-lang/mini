const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Bus registration number is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Registration number cannot exceed 30 characters.'],
    },
    fleetNumber: {
      type: String,
      required: [true, 'Fleet number is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Fleet number cannot exceed 30 characters.'],
    },
    manufacturer: { type: String, trim: true, maxlength: 80 },
    model: { type: String, trim: true, maxlength: 80 },
    totalSeats: {
      type: Number,
      default: 50,
      immutable: true,
      min: 50,
      max: 50,
    },
    availableSeats: {
      type: Number,
      default: 50,
      min: 0,
      max: 50,
    },
    currentRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

busSchema.index({ currentRoute: 1 });

module.exports = mongoose.model('Bus', busSchema);
