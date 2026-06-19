const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado. Token no valido.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    // Diferenciar expirado de inválido y devolver SIEMPRE 401 para que el
    // frontend pueda auto-cerrar sesión de forma consistente.
    const expired = ex.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Token expirado' : 'Token inválido',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
};

module.exports = authenticateToken;