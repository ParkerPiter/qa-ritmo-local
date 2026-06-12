module.exports = (sequelize, DataTypes) => {
  const ArtistFollow = sequelize.define('ArtistFollow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Usuario que sigue.
    followerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Usuario artista que es seguido.
    artistUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['followerUserId', 'artistUserId']
      }
    ]
  });

  ArtistFollow.associate = (models) => {
    ArtistFollow.belongsTo(models.User, { foreignKey: 'followerUserId', as: 'follower' });
    ArtistFollow.belongsTo(models.User, { foreignKey: 'artistUserId', as: 'artist' });
  };

  return ArtistFollow;
};
