const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: process.env.DB_PORT,
});

const User = require('./User')(sequelize, Sequelize.DataTypes);
const Anunciante = require('./Anunciante')(sequelize, Sequelize.DataTypes);
const Anuncio = require('./Anuncio')(sequelize, Sequelize.DataTypes);
const Categoria = require('./Categoria')(sequelize, Sequelize.DataTypes);

const db = {
  sequelize,
  Sequelize,
  User,
  Anunciante,
  Anuncio,
  Categoria
};

module.exports = db;