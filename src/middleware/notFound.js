// Intercepts requests to nonexistent routes and returns a standard 404 JSON response.
export function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
}
