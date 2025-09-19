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
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).send('El email ya está en uso');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await UserModel.create({ email, password: hashedPassword, fullName });
        const userResponse = {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      };
        res.status(201).json({
          message: 'Usuario creado exitosamente',
          user: userResponse
        });
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
        res.status(200).json({
            message: 'Usuario logueado exitosamente',
            token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    photoURL: user.photoURL
                }
        });
    }
    catch(error){
        res.status(500).send(error.message);
    }
};

async function loginWithGoogle(req, res) {
  const { email, fullName } = req.body;
  try {
    const userModel = User(sequelize, Sequelize.DataTypes);
    let user = await userModel.findOne({ where: { email } });

    // Si el usuario no existe, lo crea sin password
    if (!user) {
      user = await userModel.create({ email, password: null, fullName });
    } else {
      // Si existe, actualiza nombre y foto por si cambiaron en Google
      await userModel.update({ fullName }, { where: { email } });
      user = await userModel.findOne({ where: { email } });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Usuario logueado con Google exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      }
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
}


async function updateUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email y nueva contraseña son requeridos');
    }
    try {
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: { email } });
        if (!user) {
            return res.status(404).send('Usuario no encontrado');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await userModel.update({ password: hashedPassword }, { where: { email } });

        return res.send('Contraseña actualizada exitosamente');
    } catch (error) {
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

module.exports = { getAllUsers, createUser, updateUser, deleteUser, loginUser, loginWithGoogle, findUserByEmail };

