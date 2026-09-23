const axios = require('axios');
const Route = require('../models/Route');
const AppError = require('../utils/AppError');
const { googleMapsServerApiKey } = require('../config/env');

const CACHE_TTL_MS = 10 * 60 * 1000;
const directionCache = new Map();

function point(stop) {
  const [longitude, latitude] = stop.location.coordinates;
  return { location: { latLng: { latitude, longitude } } };
}

async function getRouteDirections(routeId) {
  const cached = directionCache.get(routeId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const route = await Route.findById(routeId).populate('stops.stop', 'name code location');
  if (!route) throw new AppError('Route not found.', 404);
  const stops = route.stops.sort((left, right) => left.sequence - right.sequence).map((item) => item.stop);
  if (stops.length < 2) throw new AppError('This route needs at least two stops before it can be drawn.', 409);

  const fallback = {
    source: 'stops',
    route: { id: route.id, name: route.name, code: route.code, direction: route.direction },
    stops: stops.map((stop) => ({ id: stop.id, name: stop.name, code: stop.code, location: stop.location })),
    encodedPolyline: null,
    distanceMeters: null,
    durationSeconds: null,
  };

  // A missing server key still allows the app to show an ordered stop line.
  // With Directions API enabled, this becomes a road-following Google route.
  if (!googleMapsServerApiKey) return fallback;

  const payload = {
    origin: point(stops[0]),
    destination: point(stops[stops.length - 1]),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  };
  // Routes API accepts up to 25 intermediate waypoints. Fall back to the
  // ordered-stop line for unusually long city routes.
  if (stops.length > 27) return fallback;
  if (stops.length > 2) payload.intermediates = stops.slice(1, -1).map(point);

  let response;
  try {
    response = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsServerApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
    });
  } catch {
    return fallback;
  }

  const googleRoute = response.data?.routes?.[0];
  if (!googleRoute?.polyline?.encodedPolyline) return fallback;
  const durationSeconds = Number.parseInt(googleRoute.duration || '0s', 10) || null;
  const value = {
    ...fallback,
    source: 'google-routes',
    encodedPolyline: googleRoute.polyline.encodedPolyline,
    distanceMeters: googleRoute.distanceMeters || null,
    durationSeconds,
  };
  directionCache.set(routeId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

module.exports = { getRouteDirections };
