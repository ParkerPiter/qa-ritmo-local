module.exports = (sequelize, DataTypes) => {
    const Admin = sequelize.define('Admin', {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
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
  
    // Anunciante.associate = (models) => {
    //   Anunciante.hasMany(models.Anuncio, { foreignKey: 'userId' });
    // };
  
    return Admin;
  };