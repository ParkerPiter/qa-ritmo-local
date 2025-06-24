const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {sequelize, Sequelize} = require('../schemas/index');
//const Admin = require('../schemas/Admin');
const Admin = require('../schemas/Admin');

async function createUserAdmin(req, res) {
    const { email, password } = req.body;
    try {
      const UserModel = Admin(sequelize, Sequelize.DataTypes);
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await Admin.create({ email, password: hashedPassword });
      res.status(201).send('Usuario creado exitosamente');
    } catch (error) {
      res.status(500).send(error.message);
    }
}

async function loginAdminUser(req, res) {
    const { email, password } = req.body;
    try{
        const userModel = Admin(sequelize, Sequelize.DataTypes);
        const user = await
        userModel.findOne({ where: {email}});
        if(!user){
            res.status(404).send('Usuario no encontrado');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Contraseña incorrecta');
        }
        
        const token = jwt.sign( { id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' } );
        res.status(200).json({ message: 'Usuario logueado exitosamente', token });
    }
    catch(error){
        res.status(500).send(error.message);
    }
}

module.exports = { createUserAdmin, loginAdminUser };