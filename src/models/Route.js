const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema(
  {
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusStop',
      required: true,
    },
    sequence: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required.'],
      trim: true,
      maxlength: [120, 'Route name cannot exceed 120 characters.'],
    },
    code: {
      type: String,
      required: [true, 'Route code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Route code cannot exceed 30 characters.'],
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound', 'circular'],
      required: [true, 'Route direction is required.'],
    },
    origin: { type: String, trim: true, maxlength: 120 },
    destination: { type: String, trim: true, maxlength: 120 },
    stops: { type: [routeStopSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

routeSchema.index({ 'stops.stop': 1 });

module.exports = mongoose.model('Route', routeSchema);
