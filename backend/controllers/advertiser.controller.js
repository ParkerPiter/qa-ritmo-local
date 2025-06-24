const Anunciante = require('../schemas/Anunciante');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {sequelize, Sequelize} = require('../schemas/index');

async function getAllAdvertisers(req, res) {
    try{
        const userModel = Anunciante(sequelize, Sequelize.DataTypes);
        const advertisers = await userModel.findAll();
        res.send(advertisers);
    }
    catch(error){
        res.status(500);
    }
}

async function createAdvertiser(req, res) {
    const { email, phone, password} = req.body;
    try {
      const UserModel = Anunciante(sequelize, Sequelize.DataTypes);
      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdvertiser = await UserModel.create({ email, password: hashedPassword, phone });
      res.status(201).send('Usuario creado exitosamente');
    } catch (error) {
      res.status(500).send(error.message);
    }
  }

async function loginAdvertiser(req, res) {
    const { email, password } = req.body;
    try{
        const userModel = Anunciante(sequelize, Sequelize.DataTypes);
        const advertiser = await userModel.findOne({ where: {email}});
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
};

async function updateAdvertiser(req, res) {
    const { email, password, newPassword, confirmNewPassword} = req.body;

    const userModel = Anunciante(sequelize, Sequelize.DataTypes);
    if(password !== userModel.password){
        res.status(400).send('Las contraseñas no coinciden');
    }
    try{
        const userModel = Anunciante(sequelize, Sequelize.DataTypes);
        const advertiser = await Anunciante.findOne({where :{email}});
        if(!advertiser){
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

async function deleteAdvertiser(req, res) {
    const { email } = req.body;
    try{
        const userModel = Anunciante(sequelize, Sequelize.DataTypes);
        const user = await Anunciante.findOne({where:{email}});
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

async function createAd(req, res) {
    const { titulo, descripcion, precio, disponibilidad, ubicacion, garantia, galeriaImagenes, categoryId } = req.body;
    try {
 
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).send('Token no proporcionado');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        const advertiserId = decoded.id; 

        const adModel = Anuncio(sequelize, Sequelize.DataTypes);

        const newAd = await adModel.create({
            titulo,
            descripcion,
            precio,
            galeriaImagenes,
            disponibilidad,
            ubicacion,
            garantia,
            categoryId,
            advertiserId 
        });

        res.status(201).json({ message: 'Anuncio creado exitosamente', ad: newAd });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send('Token inválido');
        }
        res.status(500).send(error.message);
    }
}

async function updateAd(req, res) {
    const { id } = req.params;
    const { titulo, descripcion, precio, disponibilidad, ubicacion, garantia, categoryId } = req.body;

    try {
        // const token = req.headers['authorization']?.split(' ')[1];
        // if (!token) {
        //     return res.status(401).send('Token no proporcionado');
        // }
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // const advertiserId = decoded.id;
        const adModel = Anuncio(sequelize, Sequelize.DataTypes);
        // const ad = await adModel.findOne({ where: { id, advertiserId } });
        // if (!ad) {
        //     return res.status(404).send('Anuncio no encontrado o no autorizado');
        // }

        await adModel.update(
            { titulo, descripcion, precio, disponibilidad, ubicacion, garantia, categoryId },
            { where: { id } }
        );

        res.status(200).send('Anuncio actualizado exitosamente');
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send('Token inválido');
        }
        res.status(500).send(error.message);
    }
}

async function deleteAd(req, res) {
    const { id } = req.params;

    try {
        // const token = req.headers['authorization']?.split(' ')[1];
        // if (!token) {
        //     return res.status(401).send('Token no proporcionado');
        // }
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // const advertiserId = decoded.id;
        const adModel = Anuncio(sequelize, Sequelize.DataTypes);
        // const ad = await adModel.findOne({ where: { id, advertiserId } });
        // if (!ad) {
        //     return res.status(404).send('Anuncio no encontrado o no autorizado');
        // }
        await adModel.destroy({ where: { id } });

        res.status(200).send('Anuncio eliminado exitosamente');
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send('Token inválido');
        }
        res.status(500).send(error.message);
    }
}

async function findUserByEmail(req, res) {
    const { email } = req.query; 

    try {
        const userModel = Anunciante(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: { email } });

        if (!user) {
            return res.status(404).send('Anunciante no encontrado');
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
}

module.exports = { getAllAdvertisers, createAdvertiser, updateAdvertiser, deleteAdvertiser, loginAdvertiser, createAd, updateAd, deleteAd, findUserByEmail };