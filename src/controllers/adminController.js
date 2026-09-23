const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const BusStop = require('../models/BusStop');
const Terminal = require('../models/Terminal');
const LiveLocation = require('../models/LiveLocation');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const activeThreshold = new Date(Date.now() - 120000);
  const [drivers, buses, routes, busStops, terminals, liveBuses] = await Promise.all([
    Driver.countDocuments({ isActive: true }), Bus.countDocuments(), Route.countDocuments(), BusStop.countDocuments(), Terminal.countDocuments(),
    LiveLocation.countDocuments({ online: true, recordedAt: { $gte: activeThreshold } }),
  ]);
  res.json({ success: true, stats: { drivers, buses, routes, busStops, terminals, liveBuses } });
});

const listDrivers = asyncHandler(async (req, res) => {
  const drivers = await Driver.find().populate('assignedBus', 'registrationNumber fleetNumber currentRoute').sort({ fullName: 1 });
  res.json({ success: true, count: drivers.length, drivers });
});

const createDriver = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const existing = await Driver.exists({ $or: [{ email: String(email).toLowerCase().trim() }, { phone: String(phone).trim() }] });
  if (existing) throw new AppError('A driver already exists with this email or phone number.', 409);
  const driver = await Driver.create({ fullName, email, phone, password });
  res.status(201).json({ success: true, driver });
});

const assignDriverBus = asyncHandler(async (req, res) => {
  const { busId } = req.body;
  const driver = await Driver.findById(req.params.driverId);
  if (!driver) throw new AppError('Driver not found.', 404);
  const previousBusId = driver.assignedBus;

  if (!busId) {
    if (previousBusId) await Bus.findByIdAndUpdate(previousBusId, { $set: { assignedDriver: null } });
    driver.assignedBus = null;
    await driver.save({ validateBeforeSave: false });
    return res.json({ success: true, driver });
  }
  const bus = await Bus.findById(busId);
  if (!bus) throw new AppError('Bus not found.', 404);
  if (bus.assignedDriver && bus.assignedDriver.toString() !== driver.id) throw new AppError('This bus already has another assigned driver.', 409);
  if (previousBusId && previousBusId.toString() !== bus.id) await Bus.findByIdAndUpdate(previousBusId, { $set: { assignedDriver: null } });
  driver.assignedBus = bus.id;
  bus.assignedDriver = driver.id;
  await Promise.all([driver.save({ validateBeforeSave: false }), bus.save()]);
  await driver.populate('assignedBus', 'registrationNumber fleetNumber currentRoute');
  return res.json({ success: true, driver });
});

module.exports = { dashboard, listDrivers, createDriver, assignDriverBus };
