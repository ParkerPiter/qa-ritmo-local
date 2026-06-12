module.exports = (sequelize, DataTypes) => {
  const ArtistProfile = sequelize.define('ArtistProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // 1:1 con User. fullName, location y profileImage viven en User (no se duplican aquí).
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    instagram: {
      type: DataTypes.STRING,
      allowNull: true
    },
    soundcloud: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  ArtistProfile.associate = (models) => {
    ArtistProfile.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

    // Declarado aquí para no editar User.js.
    models.User.hasOne(ArtistProfile, { foreignKey: 'userId', as: 'artistProfile' });
  };

  return ArtistProfile;
};
