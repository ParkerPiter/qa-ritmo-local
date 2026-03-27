module.exports = (sequelize, DataTypes) => {
  const SolicitudRol = sequelize.define('SolicitudRol', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rolSolicitado: {
      type: DataTypes.ENUM('artist', 'partner'),
      allowNull: false
    },
    estado: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    fechaSolicitud: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  SolicitudRol.associate = (models) => {
    SolicitudRol.belongsTo(models.User, { foreignKey: 'userId', as: 'usuario' });
  };

  return SolicitudRol;
};
