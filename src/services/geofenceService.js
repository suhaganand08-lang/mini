const Terminal = require('../models/Terminal');

function distanceInMeters([longitudeA, latitudeA], [longitudeB, latitudeB]) {
  const earthRadius = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB))
    * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function detectTerminal({ longitude, latitude }) {
  const coordinates = [Number(longitude), Number(latitude)];
  if (!Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;

  const candidates = await Terminal.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: 5000,
      },
    },
  }).populate('nextRoute', 'name code direction');

  for (const terminal of candidates) {
    const distanceMeters = distanceInMeters(coordinates, terminal.location.coordinates);
    if (distanceMeters <= terminal.radiusMeters) {
      return { terminal, distanceMeters: Math.round(distanceMeters) };
    }
  }

  return null;
}

module.exports = { detectTerminal };
