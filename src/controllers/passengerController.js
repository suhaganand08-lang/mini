const BusStop = require('../models/BusStop');
const LiveLocation = require('../models/LiveLocation');
const Route = require('../models/Route');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { estimateEta } = require('../services/etaService');
const { distanceInMeters } = require('../utils/geo');
const { getRouteDirections } = require('../services/routeDirectionsService');

function getCoordinates(query) {
  const latitude = Number(query.latitude ?? query.lat);
  const longitude = Number(query.longitude ?? query.lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError('Valid latitude and longitude query parameters are required.', 400);
  }
  return [longitude, latitude];
}

function getRadius(value) {
  if (value === undefined) return 3000;
  const radius = Number(value);
  if (!Number.isFinite(radius) || radius < 100 || radius > 20000) {
    throw new AppError('radius must be between 100 and 20000 metres.', 400);
  }
  return radius;
}

function getServiceStopRadius(value) {
  if (value === undefined) return 50;
  const radius = Number(value);
  if (!Number.isFinite(radius) || radius < 20 || radius > 200) {
    throw new AppError('radius must be between 20 and 200 metres for nearby-stop service.', 400);
  }
  return radius;
}

function recentLiveQuery() {
  return { online: true, recordedAt: { $gte: new Date(Date.now() - 120000) } };
}

const getLiveBuses = asyncHandler(async (req, res) => {
  const filter = recentLiveQuery();
  if (req.query.routeId) filter.route = req.query.routeId;

  const buses = await LiveLocation.find(filter)
    .populate('bus', 'registrationNumber fleetNumber totalSeats availableSeats')
    .populate('route', 'name code direction')
    .sort({ recordedAt: -1 });
  res.status(200).json({ success: true, count: buses.length, buses });
});

const getNearby = asyncHandler(async (req, res) => {
  const coordinates = getCoordinates(req.query);
  const radius = getRadius(req.query.radius);
  const geoCondition = {
    $near: {
      $geometry: { type: 'Point', coordinates },
      $maxDistance: radius,
    },
  };

  const [busStops, buses] = await Promise.all([
    BusStop.find({ location: geoCondition }).limit(30),
    LiveLocation.find({ ...recentLiveQuery(), location: geoCondition })
      .populate('bus', 'registrationNumber fleetNumber totalSeats availableSeats')
      .populate('route', 'name code direction')
      .limit(50),
  ]);

  res.status(200).json({
    success: true,
    search: { latitude: coordinates[1], longitude: coordinates[0], radiusMeters: radius },
    busStops,
    buses,
  });
});

// Public map data. Unlike nearby-service, this is not limited by the 50 m
// passenger-to-stop rule, so the map can always show the city network.
const getNetworkOverview = asyncHandler(async (req, res) => {
  const [stops, routes, locations] = await Promise.all([
    BusStop.find().sort({ name: 1 }),
    Route.find().populate('stops.stop', 'name code location').select('name code direction origin destination stops').sort({ code: 1 }),
    LiveLocation.find(recentLiveQuery())
      .populate('bus', 'registrationNumber fleetNumber totalSeats availableSeats')
      .populate('route', 'name code direction')
      .sort({ recordedAt: -1 }),
  ]);
  res.status(200).json({ success: true, stops, routes, buses: locations });
});

const getEtaForStop = asyncHandler(async (req, res) => {
  const busStop = await BusStop.findById(req.params.stopId);
  if (!busStop) throw new AppError('Bus stop not found.', 404);

  const routeFilter = { 'stops.stop': busStop.id };
  if (req.query.routeId) routeFilter._id = req.query.routeId;
  const routes = await Route.find(routeFilter).select('_id name code direction');
  if (!routes.length) throw new AppError('No route serving this bus stop was found.', 404);

  const routeIds = routes.map((route) => route.id);
  const locations = await LiveLocation.find({ ...recentLiveQuery(), route: { $in: routeIds } })
    .populate('bus', 'registrationNumber fleetNumber totalSeats availableSeats')
    .populate('route', 'name code direction');
  const arrivals = locations.map((location) => ({
    bus: location.bus,
    route: location.route,
    liveLocationId: location.id,
    recordedAt: location.recordedAt,
    ...estimateEta(location, busStop),
  })).sort((left, right) => left.etaMinutes - right.etaMinutes);

  res.status(200).json({
    success: true,
    busStop,
    count: arrivals.length,
    arrivals,
  });
});

const getNearbyService = asyncHandler(async (req, res) => {
  const coordinates = getCoordinates(req.query);
  const radius = getServiceStopRadius(req.query.radius);
  const [nearestStop] = await BusStop.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: radius,
      },
    },
  }).limit(1);

  if (!nearestStop) {
    return res.status(200).json({
      success: true,
      nearestStop: null,
      routes: [],
      buses: [],
      message: 'No bus stop was found within the selected radius.',
    });
  }

  const routes = await Route.find({ 'stops.stop': nearestStop.id })
    .populate('stops.stop', 'name code location')
    .select('name code direction origin destination stops');
  const routeIds = routes.map((route) => route.id);
  const activeLocations = await LiveLocation.find({ ...recentLiveQuery(), route: { $in: routeIds } })
    .populate('bus', 'registrationNumber fleetNumber totalSeats availableSeats')
    .populate('route', 'name code direction');

  const routeById = new Map(routes.map((route) => [route.id, route]));
  const buses = activeLocations.map((location) => {
    const route = routeById.get(location.route.id);
    const stopSequence = route.stops.find((item) => item.stop.id === nearestStop.id)?.sequence;
    let nearestSequence = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const item of route.stops) {
      const distance = distanceInMeters(location.location.coordinates, item.stop.location.coordinates);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSequence = item.sequence;
      }
    }
    const eta = estimateEta(location, nearestStop);
    return {
      bus: location.bus,
      route: location.route,
      location: location.location,
      heading: location.heading,
      speedKph: location.speedKph,
      recordedAt: location.recordedAt,
      stopSequence,
      nearestRouteStopSequence: nearestSequence,
      isApproaching: nearestSequence === null || nearestSequence <= stopSequence,
      ...eta,
    };
  }).filter((bus) => bus.isApproaching).sort((left, right) => left.etaMinutes - right.etaMinutes)
    .map((bus, index) => ({ ...bus, queuePosition: index + 1 }));

  res.status(200).json({
    success: true,
    search: { latitude: coordinates[1], longitude: coordinates[0], radiusMeters: radius },
    nearestStop,
    routes: routes.map((route) => ({ id: route.id, name: route.name, code: route.code, direction: route.direction })),
    buses,
  });
});

const getDirectionsForRoute = asyncHandler(async (req, res) => {
  const directions = await getRouteDirections(req.params.routeId);
  res.status(200).json({ success: true, directions });
});

module.exports = { getLiveBuses, getNearby, getNetworkOverview, getEtaForStop, getNearbyService, getDirectionsForRoute };
