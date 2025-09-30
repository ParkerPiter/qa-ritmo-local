module.exports = (sequelize, DataTypes) => {
    const Organizador = sequelize.define('Organizador', {
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
        allowNull: false,
        validate: {
          isNumeric: false
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [7, 100]
        }
      },
      nombreCompleto: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });
  
    Organizador.associate = (models) => {
      Organizador.hasMany(models.Evento, { foreignKey: 'organizadorId' });
    };
  
    return Organizador;
  };