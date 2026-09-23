const { distanceInMeters } = require('../utils/geo');

function estimateEta(liveLocation, busStop) {
  const distanceMeters = distanceInMeters(liveLocation.location.coordinates, busStop.location.coordinates);
  const speedKph = liveLocation.speedKph && liveLocation.speedKph >= 5 ? liveLocation.speedKph : 20;
  const etaSeconds = Math.ceil(distanceMeters / (speedKph * 1000 / 3600));

  return {
    distanceMeters: Math.round(distanceMeters),
    etaMinutes: Math.max(1, Math.ceil(etaSeconds / 60)),
    estimatedArrivalAt: new Date(Date.now() + etaSeconds * 1000).toISOString(),
    speedKphUsed: speedKph,
    method: 'straight_line_speed_estimate',
  };
}

module.exports = { estimateEta };
