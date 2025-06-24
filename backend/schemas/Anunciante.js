module.exports = (sequelize, DataTypes) => {
    const Anunciante = sequelize.define('Anunciante', {
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
    });
  
    Anunciante.associate = (models) => {
      Anunciante.hasMany(models.Anuncio, { foreignKey: 'userId' });
    };
  
    return Anunciante;
  };