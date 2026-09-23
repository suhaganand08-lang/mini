function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = error.statusCode || 500;
  if (error.name === 'ValidationError' || error.name === 'CastError') statusCode = 400;
  if (error.code === 11000) statusCode = 409;
  const message = statusCode >= 500 ? 'An internal server error occurred.' : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.name === 'ValidationError' && {
      errors: Object.values(error.errors).map((validationError) => validationError.message),
    }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

module.exports = { notFound, errorHandler };
