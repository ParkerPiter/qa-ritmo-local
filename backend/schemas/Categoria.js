module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define('Categoria', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['TYPE', 'GENRE', 'LOCATION']]
      }
    }
  });

  Categoria.associate = (models) => {
    Categoria.belongsToMany(models.Evento, { 
      as: 'eventos',  // Cambiar de 'Eventos' a 'eventos'
      through: 'EventoCategorias', 
      foreignKey: 'categoriaId' 
    });
  };

  return Categoria;
};