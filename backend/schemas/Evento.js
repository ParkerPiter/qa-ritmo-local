module.exports = (sequelize, DataTypes) => {
  const Evento = sequelize.define('Evento', {
    titulo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ubicacion: {
      type: DataTypes.STRING,
      allowNull: true 
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false
    },
    galeriaImagenes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    organizadorId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Organizadors',
        key: 'id'
      },
      allowNull: false
    },
    precio: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
  });

  Evento.associate = (models) => {
    Evento.belongsTo(models.Organizador, { as: 'Organizador', foreignKey: 'organizadorId' });
    Evento.belongsToMany(models.Categoria, { as: 'Categorias', through: 'EventoCategorias', foreignKey: 'eventoId' });
  };

  return Evento;
};