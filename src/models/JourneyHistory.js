const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      validate: {
        validator: (coordinates) => !coordinates || coordinates.length === 2,
        message: 'Coordinates must contain longitude and latitude.',
      },
    },
  },
  { _id: false }
);

const locationSampleSchema = new mongoose.Schema(
  {
    location: { type: pointSchema, required: true },
    speedKph: Number,
    heading: Number,
    recordedAt: { type: Date, required: true },
  },
  { _id: false }
);

const journeyHistorySchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true, index: true },
    currentRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    lastLocation: { type: pointSchema, default: null },
    lastTerminal: { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', default: null },
    locationSamples: { type: [locationSampleSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

journeyHistorySchema.index({ driver: 1, status: 1 });
journeyHistorySchema.index({ bus: 1, status: 1 });

module.exports = mongoose.model('JourneyHistory', journeyHistorySchema);
