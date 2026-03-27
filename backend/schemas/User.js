module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [7, 100]
      }
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [3, 100]
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 200]
      }
    },
    profileImage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    interests: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    rol: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'client'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    stripeAccountId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    stripeOnboardingDone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  });

  User.associate = (models) => {
    // Relación con favoritos
    User.hasMany(models.UserFav, {
      foreignKey: 'userId',
      as: 'favoritos'
    });

    // Relación con pedidos
    User.hasMany(models.Order, {
      foreignKey: 'userId',
      as: 'orders'
    });

    // Relación con solicitudes de cambio de rol
    User.hasMany(models.SolicitudRol, {
      foreignKey: 'userId',
      as: 'solicitudesRol'
    });
  };

  return User;
};