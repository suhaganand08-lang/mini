const asyncHandler = require('../utils/asyncHandler');

const getMyProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    driver: req.driver,
  });
});

module.exports = { getMyProfile };
