const Terminal = require('../models/Terminal');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { detectTerminal } = require('../services/geofenceService');

async function validateRouteReferences(routeIds, nextRoute) {
  const references = [...(routeIds || []), ...(nextRoute ? [nextRoute] : [])];
  if (!references.length) return;
  const count = await Route.countDocuments({ _id: { $in: references } });
  if (count !== new Set(references.map(String)).size) {
    throw new AppError('One or more referenced routes do not exist.', 400);
  }
}

const createTerminal = asyncHandler(async (req, res) => {
  const {
    name, code, latitude, longitude, radiusMeters, routes = [], autoSwitchRoute = false, nextRoute,
  } = req.body;
  await validateRouteReferences(routes, nextRoute);
  if (autoSwitchRoute && !nextRoute) {
    throw new AppError('nextRoute is required when automatic route switching is enabled.', 400);
  }

  const terminal = await Terminal.create({
    name,
    code,
    radiusMeters,
    routes,
    autoSwitchRoute,
    nextRoute: nextRoute || null,
    location: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
  });
  await terminal.populate(['routes', 'nextRoute']);
  res.status(201).json({ success: true, terminal });
});

const listTerminals = asyncHandler(async (req, res) => {
  const terminals = await Terminal.find().populate('routes', 'name code direction').populate('nextRoute', 'name code direction').sort({ name: 1 });
  res.status(200).json({ success: true, count: terminals.length, terminals });
});

const checkTerminal = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const detection = await detectTerminal({ latitude, longitude });
  if (!detection) {
    return res.status(200).json({ success: true, insideTerminal: false, terminal: null });
  }

  let routeSwitched = false;
  if (detection.terminal.autoSwitchRoute && detection.terminal.nextRoute && req.driver.assignedBus) {
    const bus = await Bus.findByIdAndUpdate(req.driver.assignedBus, {
      $set: { currentRoute: detection.terminal.nextRoute._id },
    }, { new: true });
    routeSwitched = Boolean(bus);

    const io = req.app.get('io');
    if (io && bus) {
      io.to(`route:${detection.terminal.nextRoute._id}`).emit('route:changed', {
        busId: bus.id,
        route: detection.terminal.nextRoute,
      });
    }
  }

  const io = req.app.get('io');
  if (io && req.driver.assignedBus) {
    io.emit('terminal:changed', {
      busId: req.driver.assignedBus.toString(),
      terminalId: detection.terminal.id,
      terminalName: detection.terminal.name,
    });
  }

  return res.status(200).json({
    success: true,
    insideTerminal: true,
    distanceMeters: detection.distanceMeters,
    routeSwitched,
    terminal: detection.terminal,
  });
});

module.exports = { createTerminal, listTerminals, checkTerminal };
