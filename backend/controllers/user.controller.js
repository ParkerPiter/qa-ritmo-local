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

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

async function loginUser(req, res) {
    const { email, password } = req.body;
    try{
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: {email}});
        if(!user){
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        const token = jwt.sign( { id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' } 
        );
        res.status(200).json({
            success: true,
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
        res.status(500).json({
            success: false,
            message: error.message
        });
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
      success: true,
      message: 'Usuario logueado con Google exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function updateUser(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email y nueva contraseña son requeridos'
        });
    }

    try {
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await userModel.update({ password: hashedPassword }, { where: { email } });

        return res.status(200).json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function deleteUser(req, res) {
    const { email } = req.body;
    try{
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({where:{email}});
        if(!user){
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        await userModel.destroy({where:{email}});
        res.status(200).json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

async function findUserByEmail(req, res) {
    const { email } = req.query; 

    try {
        const userModel = User(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


module.exports = { getAllUsers, createUser, updateUser, deleteUser, loginUser, loginWithGoogle, findUserByEmail };