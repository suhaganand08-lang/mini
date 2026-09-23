const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema(
  {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true, unique: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    journey: { type: mongoose.Schema.Types.ObjectId, ref: 'JourneyHistory', required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null, index: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    speedKph: { type: Number, default: null, min: 0, max: 180 },
    heading: { type: Number, default: null, min: 0, max: 360 },
    accuracyMeters: { type: Number, default: null, min: 0, max: 10000 },
    recordedAt: { type: Date, required: true },
    online: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

liveLocationSchema.index({ location: '2dsphere' });
liveLocationSchema.index({ route: 1, online: 1 });

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
