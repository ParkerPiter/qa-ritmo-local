module.exports = (sequelize, DataTypes) => {
  const LandingEvent = sequelize.define('LandingEvent', {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    artistas: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    hora: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lugar: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    precio: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    ticketUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imagen: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ciudad: {
      type: DataTypes.ENUM('sf', 'la'),
      allowNull: false,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  return LandingEvent;
};
