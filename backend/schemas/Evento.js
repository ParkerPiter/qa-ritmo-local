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
    maps: {
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
    useful_information: {
      type: [
        { type: String },
        { type: Boolean },
        { type: Boolean },
        { type: Boolean },
        { type: Boolean },
        { type: Boolean }
      ],
      default: ["", false, false, false, false, false],
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return false;
          // Debe tener exactamente 6 elementos: 1 string + 5 booleans
          if (arr.length !== 6) return false;
          if (typeof arr[0] !== 'string') return false;
          for (let i = 1; i < 6; i++) {
            if (typeof arr[i] !== 'boolean') return false;
          }
          return true;
        },
        message: 'useful_information debe ser [string, boolean, boolean, boolean, boolean, boolean]'
      }
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