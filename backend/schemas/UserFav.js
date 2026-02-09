module.exports = (sequelize, DataTypes) => {
  const UserFav = sequelize.define('UserFav', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    eventoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Eventos',
        key: 'id'
      }
    }
  });

  UserFav.associate = (models) => {
    UserFav.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    UserFav.belongsTo(models.Evento, {
      foreignKey: 'eventoId',
      as: 'evento'
    });
  };

  return UserFav;
};