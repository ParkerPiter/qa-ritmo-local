module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
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
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    precioTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    estado: {
      type: DataTypes.ENUM('pending', 'paid', 'cancel', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fechaPago: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Order.belongsTo(models.Evento, {
      foreignKey: 'eventoId',
      as: 'evento'
    });
  };

  return Order;
};