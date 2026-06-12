module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id'
      }
    },
    // Denormalizado para lookup rápido del comprador.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    // Denormalizado para filtrar/validar por evento en la puerta.
    eventoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Eventos',
        key: 'id'
      }
    },
    // JWT firmado que va dentro del QR. Único por ticket.
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    usado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    fechaUso: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  });

  Ticket.associate = (models) => {
    Ticket.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    Ticket.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Ticket.belongsTo(models.Evento, { foreignKey: 'eventoId', as: 'evento' });

    // Declarado aquí para no editar UserOrder.js.
    models.Order.hasMany(Ticket, { foreignKey: 'orderId', as: 'tickets' });
  };

  return Ticket;
};
