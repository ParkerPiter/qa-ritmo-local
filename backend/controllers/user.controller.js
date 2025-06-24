const User = require('../schemas/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const {sequelize, Sequelize} = require('../schemas/index');

async function getAllUsers(req, res) {
    try{
        const userModel = User(sequelize, Sequelize.DataTypes);
        const users = await userModel.findAll();
        res.send(users);
    }
    catch(error){
        res.status(500);
    }
}

async function createUser(req, res) {
    const { email, fullName, password } = req.body;
    try {
      const UserModel = User(sequelize, Sequelize.DataTypes);
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserModel.create({ email, password: hashedPassword, fullName });
      res.status(201).send('Usuario creado exitosamente');
    } catch (error) {
      res.status(500).send(error.message);
    }
  }

async function loginUser(req, res) {
    const { email, password } = req.body;
    try{
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: {email}});
        if(!user){
            res.status(404).send('Usuario no encontrado');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Contraseña incorrecta');
        }

        const token = jwt.sign( { id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' } 
        );
        res.status(200).json({ message: 'Usuario logueado exitosamente', token });
    }
    catch(error){
        res.status(500).send(error.message);
    }
};

async function updateUser(req, res) {
    const { email, password, newPassword, confirmNewPassword} = req.body;

    const userModel = User(sequelize, Sequelize.DataTypes);
    if(password !== userModel.password){
        res.status(400).send('Las contraseñas no coinciden');
    }
    try{
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await User.findOne({where :{email}});
        if(!user){
            res.status(404).send('Usuario no encontrado');
        }

        if(newPassword && confirmNewPassword){
            if(newPassword !== confirmNewPassword){
                return res.status(400).send('Las contraseñas no coinciden');
            }
            await userModel.update({password}, {where:{email}});
            return res.send('Contraseña actualizada exitosamente');
        }
        res.send('Usuario actualizado exitosamente');
    }
    catch(error){
        res.status(500).send(error.message);
    }
}

async function deleteUser(req, res) {
    const { email } = req.body;
    try{
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await User.findOne({where:{email}});
        if(!user){
            res.status(404).send('Usuario no encontrado');
        }
        await userModel.destroy({where:{email}});
        res.send('Usuario eliminado exitosamente');
    }
    catch(error){
        res.status(500).send(error.message);
    }
};

async function findUserByEmail(req, res) {
    const { email } = req.query; 

    try {
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: { email } });

        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
}


module.exports = { getAllUsers, createUser, updateUser, deleteUser, loginUser, findUserByEmail };
