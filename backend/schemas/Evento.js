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
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false
    },
    galeriaImagenes: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false
    },
    galeriaPublicIds: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
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
          if (typeof hours !== 'string') throw new Error('Index 0 (hours) must be a string');
          for (const b of [a11y, water, foodTrucks, wifi, toilets]) {
            if (typeof b !== 'boolean') throw new Error('Index 1-5 must be boolean');
          }
        }
      }
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Descripción detallada del evento. Obligatoria y con un mínimo de 500 caracteres.
    descripcionDetallada: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [500, Infinity],
          msg: 'descripcionDetallada must have at least 500 characters'
        }
      }
    },
    // Lineup de artistas del evento: arreglo de objetos { nombre, imagen, link }.
    // Cada artista se identifica por su posición en el arreglo (índice).
    lineup: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidLineup(value) {
          if (!Array.isArray(value)) {
            throw new Error('lineup must be an array of objects');
          }
          value.forEach((artista, i) => {
            if (typeof artista !== 'object' || artista === null || Array.isArray(artista)) {
              throw new Error(`lineup[${i}] must be an object { nombre, imagen, link }`);
            }
            if (typeof artista.nombre !== 'string' || artista.nombre.trim() === '') {
              throw new Error(`lineup[${i}].nombre is required and must be a string`);
            }
            if (artista.imagen != null && typeof artista.imagen !== 'string') {
              throw new Error(`lineup[${i}].imagen must be a string`);
            }
            if (artista.link != null && typeof artista.link !== 'string') {
              throw new Error(`lineup[${i}].link must be a string`);
            }
          });
        }
      }
    },
    organizadorId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Organizadors',
        key: 'id'
      },
      allowNull: true,
      defaultValue: null
    },
    precio: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    // FK al usuario receptor del split de Stripe Connect (rol artist o partner).
    // Se setea automáticamente en la creación del evento si el creador tiene uno
    // de esos roles, y dispara Destination Charges en el checkout.
    partnerUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    maxTicketsPorUsuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      validate: { min: 1 }
    },
    fechaInicioVenta: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    fechaFinVenta: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
  });

  Evento.associate = (models) => {
    Evento.belongsTo(models.Organizador, { as: 'organizador', foreignKey: 'organizadorId' });
    Evento.belongsToMany(models.Categoria, { as: 'categorias', through: 'EventoCategorias', foreignKey: 'eventoId' });
    Evento.belongsTo(models.User, { as: 'partner', foreignKey: 'partnerUserId' });
  };

  return Evento;
};