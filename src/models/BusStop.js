const mongoose = require('mongoose');

const busStopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Bus stop name is required.'],
      trim: true,
      maxlength: [120, 'Bus stop name cannot exceed 120 characters.'],
    },
    code: {
      type: String,
      required: [true, 'Bus stop code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Bus stop code cannot exceed 30 characters.'],
    },
    landmark: { type: String, trim: true, maxlength: 160 },
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
            Number.isFinite(longitude)
            && Number.isFinite(latitude)
            && longitude >= -180 && longitude <= 180
            && latitude >= -90 && latitude <= 90
          ),
          message: 'Coordinates must be [longitude, latitude].',
        },
      },
    },
  },
  { timestamps: true, versionKey: false }
);

busStopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BusStop', busStopSchema);
