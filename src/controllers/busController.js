const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const registerBus = asyncHandler(async (req, res) => {
  const { registrationNumber, fleetNumber, manufacturer, model } = req.body;
  const bus = await Bus.create({ registrationNumber, fleetNumber, manufacturer, model });

  res.status(201).json({ success: true, bus });
});

const listBuses = asyncHandler(async (req, res) => {
  const buses = await Bus.find()
    .populate('assignedDriver', 'fullName phone')
    .populate('currentRoute', 'name code')
    .sort({ fleetNumber: 1 });

  res.status(200).json({ success: true, count: buses.length, buses });
});

const selectAssignedBus = asyncHandler(async (req, res) => {
  const { busId } = req.body;
  if (!busId) throw new AppError('busId is required.', 400);

  const bus = await Bus.findById(busId);
  if (!bus) throw new AppError('Bus not found.', 404);

  if (bus.assignedDriver && bus.assignedDriver.toString() !== req.driver.id) {
    throw new AppError('This bus is already assigned to another driver.', 409);
  }

  const previousBusId = req.driver.assignedBus;
  if (previousBusId && previousBusId.toString() !== bus.id) {
    await Bus.findByIdAndUpdate(previousBusId, { $set: { assignedDriver: null } });
  }

  bus.assignedDriver = req.driver.id;
  await bus.save();
  await Driver.findByIdAndUpdate(req.driver.id, { $set: { assignedBus: bus.id } });

  res.status(200).json({
    success: true,
    message: 'Bus selected successfully.',
    bus,
  });
});

const setBusRoute = asyncHandler(async (req, res) => {
  const { routeId } = req.body;
  if (!routeId) throw new AppError('routeId is required.', 400);

  const route = await Route.findById(routeId);
  if (!route) throw new AppError('Route not found.', 404);
  const bus = await Bus.findByIdAndUpdate(req.params.busId, { $set: { currentRoute: route.id } }, {
    new: true,
    runValidators: true,
  }).populate('currentRoute', 'name code direction');
  if (!bus) throw new AppError('Bus not found.', 404);

  res.status(200).json({ success: true, bus });
});

module.exports = { registerBus, listBuses, selectAssignedBus, setBusRoute };
