const mongoose = require('mongoose');

const terminalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Terminal name is required.'],
      trim: true,
      maxlength: [120, 'Terminal name cannot exceed 120 characters.'],
    },
    code: {
      type: String,
      required: [true, 'Terminal code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Terminal code cannot exceed 30 characters.'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: ([longitude, latitude]) => (
            Number.isFinite(longitude) && Number.isFinite(latitude)
            && longitude >= -180 && longitude <= 180
            && latitude >= -90 && latitude <= 90
          ),
          message: 'Coordinates must be [longitude, latitude].',
        },
      },
    },
    radiusMeters: {
      type: Number,
      default: 200,
      min: [25, 'Terminal radius must be at least 25 metres.'],
      max: [5000, 'Terminal radius cannot exceed 5000 metres.'],
    },
    routes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Route' }],
    autoSwitchRoute: { type: Boolean, default: false },
    nextRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  },
  { timestamps: true, versionKey: false }
);

terminalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Terminal', terminalSchema);
