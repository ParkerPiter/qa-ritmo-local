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
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ["", false, false, false, false, false],
      validate: {
        isValidArray(value) {
          if (!Array.isArray(value) || value.length !== 6) {
            throw new Error('useful_information debe ser un arreglo de 6 elementos');
          }
          const [hours, a11y, water, foodTrucks, wifi, toilets] = value;
          if (typeof hours !== 'string') throw new Error('El índice 0 (horas) debe ser string');
          for (const b of [a11y, water, foodTrucks, wifi, toilets]) {
            if (typeof b !== 'boolean') throw new Error('Índices 1-5 deben ser boolean');
          }
        }
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