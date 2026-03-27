/**
 * Middleware de autorización por roles.
 * Uso: requireRoles(['admin', 'artist', 'partner'])
 * Debe ir después de authenticateToken.
 */
const requireRoles = (roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}.`
    });
  }
  next();
};

module.exports = requireRoles;
