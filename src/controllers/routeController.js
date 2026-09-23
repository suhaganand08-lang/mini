const Route = require('../models/Route');
const BusStop = require('../models/BusStop');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

async function createOrderedStops(stopIds) {
  if (!stopIds) return [];
  if (!Array.isArray(stopIds) || stopIds.length < 2) {
    throw new AppError('A route must contain at least two bus stop IDs.', 400);
  }
  if (new Set(stopIds).size !== stopIds.length) {
    throw new AppError('A route cannot contain the same bus stop twice.', 400);
  }

  const count = await BusStop.countDocuments({ _id: { $in: stopIds } });
  if (count !== stopIds.length) throw new AppError('One or more bus stops do not exist.', 400);
  return stopIds.map((stop, index) => ({ stop, sequence: index + 1 }));
}

const createRoute = asyncHandler(async (req, res) => {
  const { name, code, direction, origin, destination, stopIds } = req.body;
  const stops = await createOrderedStops(stopIds);
  const route = await Route.create({ name, code, direction, origin, destination, stops });
  await route.populate('stops.stop');

  res.status(201).json({ success: true, route });
});

const listRoutes = asyncHandler(async (req, res) => {
  const routes = await Route.find().select('name code direction origin destination stops').sort({ code: 1 });
  res.status(200).json({ success: true, count: routes.length, routes });
});

const getRoute = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.routeId).populate('stops.stop');
  if (!route) throw new AppError('Route not found.', 404);
  res.status(200).json({ success: true, route });
});

const setRouteStops = asyncHandler(async (req, res) => {
  const stops = await createOrderedStops(req.body.stopIds);
  const route = await Route.findByIdAndUpdate(req.params.routeId, { $set: { stops } }, {
    new: true,
    runValidators: true,
  }).populate('stops.stop');
  if (!route) throw new AppError('Route not found.', 404);
  res.status(200).json({ success: true, route });
});

module.exports = { createRoute, listRoutes, getRoute, setRouteStops };
