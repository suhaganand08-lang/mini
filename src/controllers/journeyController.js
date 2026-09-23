const Bus = require('../models/Bus');
const JourneyHistory = require('../models/JourneyHistory');
const LiveLocation = require('../models/LiveLocation');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { detectTerminal } = require('../services/geofenceService');

const BUS_TOTAL_SEATS = 50;

function validCoordinate(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function optionalNumber(value, minimum, maximum, field) {
  if (value === undefined || value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new AppError(`${field} must be between ${minimum} and ${maximum}.`, 400);
  }
  return number;
}

const startJourney = asyncHandler(async (req, res) => {
  if (!req.driver.assignedBus) throw new AppError('Select an assigned bus before starting a journey.', 409);
  if (req.driver.activeJourney) throw new AppError('You already have an active journey.', 409);

  const bus = await Bus.findById(req.driver.assignedBus);
  if (!bus || bus.assignedDriver?.toString() !== req.driver.id) {
    throw new AppError('Your assigned bus is unavailable.', 409);
  }

  // Every city bus has a fixed capacity of 50. A new journey begins with all
  // seats available; the conductor updates this as passengers board or leave.
  bus.availableSeats = BUS_TOTAL_SEATS;
  await bus.save();

  const journey = await JourneyHistory.create({
    driver: req.driver.id,
    bus: bus.id,
    currentRoute: bus.currentRoute,
  });
  req.driver.activeJourney = journey.id;
  await req.driver.save({ validateBeforeSave: false });

  req.app.get('io')?.emit('bus:online', { busId: bus.id, routeId: bus.currentRoute });
  res.status(201).json({ success: true, journey });
});

const updateSeatAvailability = asyncHandler(async (req, res) => {
  const availableSeats = Number(req.body.availableSeats);
  if (!Number.isInteger(availableSeats)) {
    throw new AppError('availableSeats must be a whole number.', 400);
  }
  if (!req.driver.activeJourney || !req.driver.assignedBus) {
    throw new AppError('Start a journey before updating seat availability.', 409);
  }

  const journey = await JourneyHistory.findOne({ _id: req.driver.activeJourney, status: 'active' });
  if (!journey) throw new AppError('No active journey was found.', 409);

  const bus = await Bus.findById(req.driver.assignedBus);
  if (!bus) throw new AppError('Assigned bus was not found.', 404);
  if (availableSeats < 0 || availableSeats > BUS_TOTAL_SEATS) {
    throw new AppError(`availableSeats must be between 0 and ${BUS_TOTAL_SEATS}.`, 400);
  }

  bus.availableSeats = availableSeats;
  await bus.save();

  const event = { busId: bus.id, routeId: bus.currentRoute, availableSeats, totalSeats: BUS_TOTAL_SEATS };
  // Seat availability is city-wide public data. Broadcast globally so a
  // passenger who has just reconnected still receives the live update.
  req.app.get('io')?.emit('bus:seats', event);

  res.status(200).json({
    success: true,
    bus: { id: bus.id, totalSeats: BUS_TOTAL_SEATS, availableSeats: bus.availableSeats },
  });
});

const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, speedKph, heading, accuracyMeters, recordedAt } = req.body;
  const latitudeNumber = validCoordinate(latitude, -90, 90);
  const longitudeNumber = validCoordinate(longitude, -180, 180);
  if (latitudeNumber === null || longitudeNumber === null) {
    throw new AppError('Valid latitude and longitude are required.', 400);
  }
  if (!req.driver.activeJourney || !req.driver.assignedBus) {
    throw new AppError('Start a journey before sending location updates.', 409);
  }

  const journey = await JourneyHistory.findOne({ _id: req.driver.activeJourney, status: 'active' });
  if (!journey) throw new AppError('No active journey was found.', 409);
  const bus = await Bus.findById(req.driver.assignedBus);
  if (!bus) throw new AppError('Assigned bus was not found.', 404);

  const point = { type: 'Point', coordinates: [longitudeNumber, latitudeNumber] };
  const timestamp = recordedAt ? new Date(recordedAt) : new Date();
  if (Number.isNaN(timestamp.getTime())) throw new AppError('recordedAt must be a valid date.', 400);
  const telemetry = {
    speedKph: optionalNumber(speedKph, 0, 180, 'speedKph'),
    heading: optionalNumber(heading, 0, 360, 'heading'),
    accuracyMeters: optionalNumber(accuracyMeters, 0, 10000, 'accuracyMeters'),
  };

  const detection = await detectTerminal({ latitude: latitudeNumber, longitude: longitudeNumber });
  let terminal = null;
  let routeChanged = false;
  let terminalEntered = false;
  if (detection) {
    terminal = detection.terminal;
    if (journey.lastTerminal?.toString() !== terminal.id) {
      terminalEntered = true;
      journey.lastTerminal = terminal.id;
      if (terminal.autoSwitchRoute && terminal.nextRoute) {
        bus.currentRoute = terminal.nextRoute._id;
        journey.currentRoute = terminal.nextRoute._id;
        await bus.save();
        routeChanged = true;
      }
    }
  } else {
    journey.lastTerminal = null;
  }

  journey.lastLocation = point;
  journey.locationSamples.push({ location: point, speedKph: telemetry.speedKph, heading: telemetry.heading, recordedAt: timestamp });
  if (journey.locationSamples.length > 2000) journey.locationSamples.splice(0, journey.locationSamples.length - 2000);
  await journey.save();

  const liveLocation = await LiveLocation.findOneAndUpdate(
    { bus: bus.id },
    {
      $set: {
        bus: bus.id,
        driver: req.driver.id,
        journey: journey.id,
        route: bus.currentRoute,
        location: point,
        ...telemetry,
        recordedAt: timestamp,
        online: true,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const event = {
    busId: bus.id,
    routeId: bus.currentRoute,
    location: liveLocation.location,
    speedKph: liveLocation.speedKph,
    heading: liveLocation.heading,
    recordedAt: liveLocation.recordedAt,
  };
  const io = req.app.get('io');
  if (bus.currentRoute) io?.to(`route:${bus.currentRoute}`).emit('bus:location', event);
  if (terminal && terminalEntered) {
    io?.emit('terminal:changed', { busId: bus.id, terminalId: terminal.id, terminalName: terminal.name });
  }
  if (routeChanged) io?.emit('route:changed', { busId: bus.id, routeId: bus.currentRoute });

  res.status(200).json({
    success: true,
    liveLocation,
    terminal: terminal ? { id: terminal.id, name: terminal.name, distanceMeters: detection.distanceMeters } : null,
    routeChanged,
  });
});

const stopJourney = asyncHandler(async (req, res) => {
  if (!req.driver.activeJourney || !req.driver.assignedBus) {
    throw new AppError('No active journey to stop.', 409);
  }
  const journey = await JourneyHistory.findOneAndUpdate(
    { _id: req.driver.activeJourney, status: 'active' },
    { $set: { status: 'completed', endedAt: new Date() } },
    { new: true }
  );
  if (!journey) throw new AppError('No active journey was found.', 409);

  await LiveLocation.findOneAndUpdate({ bus: req.driver.assignedBus }, { $set: { online: false } });
  const busId = req.driver.assignedBus.toString();
  req.driver.activeJourney = null;
  await req.driver.save({ validateBeforeSave: false });
  req.app.get('io')?.emit('bus:offline', { busId, endedAt: journey.endedAt });

  res.status(200).json({ success: true, journey });
});

module.exports = { startJourney, updateLocation, updateSeatAvailability, stopJourney };
