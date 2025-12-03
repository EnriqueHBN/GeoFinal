

function logError(err, req, res, next) {
  console.error('🔴 Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next(err);
}

function errorHandler(err, req, res, next) {
  // Si los headers ya fueron enviados, delegar al manejador por defecto
  if (res.headersSent) {
    return next(err);
  }

  // Determinar el status code
  const statusCode = err.statusCode || err.status || 500;

  // Respuesta de error
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Error interno del servidor',
      code: statusCode
    }
  };

  // Incluir stack trace solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Incluir detalles adicionales si existen
  if (err.details) {
    errorResponse.error.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
}


// Middleware para rutas no encontradas
function notFoundHandler(req, res, next) {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

// Manejador de errores asíncronos
function asyncErrorHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  logError,
  errorHandler,
  notFoundHandler,
  asyncErrorHandler
};