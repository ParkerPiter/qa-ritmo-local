module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define('Categoria', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });

  Categoria.associate = (models) => {
    Categoria.belongsToMany(models.Anuncio, { through: 'AnuncioCategorias', foreignKey: 'categoriaId' });
  };

  return Categoria;
};