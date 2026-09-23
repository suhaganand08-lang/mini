const BusStop = require('../models/BusStop');
const asyncHandler = require('../utils/asyncHandler');

const createBusStop = asyncHandler(async (req, res) => {
  const { name, code, landmark, latitude, longitude } = req.body;
  const busStop = await BusStop.create({
    name,
    code,
    landmark,
    location: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
  });

  res.status(201).json({ success: true, busStop });
});

const listBusStops = asyncHandler(async (req, res) => {
  const busStops = await BusStop.find().sort({ name: 1 });
  res.status(200).json({ success: true, count: busStops.length, busStops });
});

module.exports = { createBusStop, listBusStops };
