// Formats all server errors into a standard consistent JSON response.
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || null,
  });
}
