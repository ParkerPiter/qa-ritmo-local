module.exports = (sequelize, DataTypes) => {
  const Anuncio = sequelize.define('Anuncio', {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: true 
    },
    fechaCreacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    galeriaImagenes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false
    },
    disponibilidad: {
      type: DataTypes.BOOLEAN,
      default: true
    },
    garantia: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      allowNull: false
    },
    precio: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
  });

  Anuncio.associate = (models) => {
    Anuncio.belongsTo(models.User, { foreignKey: 'userId' });
    Anuncio.belongsToMany(models.Categoria, { through: 'AnuncioCategorias', foreignKey: 'anuncioId' });
  };

  return Anuncio;
};