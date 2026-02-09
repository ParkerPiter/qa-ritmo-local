const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: process.env.DB_PORT,
});

// Inicializar todos los modelos una sola vez
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Organizador = require('./Organizador')(sequelize, Sequelize.DataTypes);
const Evento = require('./Evento')(sequelize, Sequelize.DataTypes);
const Categoria = require('./Categoria')(sequelize, Sequelize.DataTypes);
const Admin = require('./Admin')(sequelize, Sequelize.DataTypes);
const Anunciante = require('./Anunciante')(sequelize, Sequelize.DataTypes);
const Anuncio = require('./Anuncio')(sequelize, Sequelize.DataTypes);
const UserFav = require('./UserFav')(sequelize, Sequelize.DataTypes);
const Order = require('./UserOrder')(sequelize, Sequelize.DataTypes);

const db = {
  sequelize,
  Sequelize,
  User,
  Organizador,
  Evento,
  Categoria,
  Admin,
  Anunciante,
  Anuncio,
  UserFav,
  Order
};

// Configurar asociaciones entre modelos
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;