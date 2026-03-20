const isArtist = (req, res, next) => {
  if (req.user?.role !== 'artist') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de artist.'
    });
  }
  next();
};

module.exports = isArtist;
