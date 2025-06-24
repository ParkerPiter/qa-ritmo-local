require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DB_URI,{
    dialect: 'postgres',
});

const bcrypt = require('bcryptjs');

// Importa el modelo Admin
const AdminModel = require('../schemas/Admin');
const Admin = AdminModel(sequelize, DataTypes);

async function createAdmin() {
  await Admin.sync(); // <-- Esto crea la tabla si no existe

  const email = process.env.EMAIL_ADMIN;
  const password = process.env.EMAIL_PASS; // Cambia esto por seguridad
  const hashedPassword = await bcrypt.hash(password, 10);

  // Verifica si ya existe un admin
  const exists = await Admin.findOne({ where: { email } });
  if (exists) {
    console.log('El usuario admin ya existe.');
    return;
  }

  await Admin.create({ email, password: hashedPassword });
  console.log('Usuario admin creado correctamente.');
}


createAdmin()
  .then(() => sequelize.close())
  .catch(err => {
    console.error(err);
    sequelize.close();
  });