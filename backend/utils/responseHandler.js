/**
 * Maneja respuestas exitosas de forma consistente
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos a enviar
 * @param {number} statusCode - Código de estado HTTP
 */
const handleSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    ...data
  });
};

/**
 * Maneja errores de forma consistente
 * @param {Error} error - Error capturado
 * @param {Object} res - Objeto response de Express
 * @param {number} statusCode - Código de estado HTTP (opcional)
 */
const handleError = (res, error, statusCode = null) => {
  console.error('Error:', error);
  
  // Determinar el código de estado si no se proporcionó
  const status = statusCode || error.statusCode || 500;
  
  res.status(status).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = {
  handleSuccess,
  handleError
};
