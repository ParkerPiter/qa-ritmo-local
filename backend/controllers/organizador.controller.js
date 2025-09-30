const Organizador = require('../schemas/Organizador');
const Evento = require('../schemas/Evento');
async function getAllOrganizadores(req, res) {
    try{
        const userModel = Organizador(sequelize, Sequelize.DataTypes);
        const organizadores = await userModel.findAll();
        res.send(organizadores);
    }
    catch(error){
        res.status(500);
    }
}

async function createOrganizador(req, res) {
    const { email, phone, password} = req.body;
    try {
      const UserModel = Organizador(sequelize, Sequelize.DataTypes);
      const hashedPassword = await bcrypt.hash(password, 10);
      const newOrganizador = await UserModel.create({ email, password: hashedPassword, phone });
      res.status(201).send('Organizador creado exitosamente');
    } catch (error) {
      res.status(500).send(error.message);
    }
  }

async function loginOrganizador(req, res) {
    const { email, password } = req.body;
    try{
        const userModel = Organizador(sequelize, Sequelize.DataTypes);
        const organizador = await userModel.findOne({ where: {email}});
        if(!organizador){
            res.status(404).send('Organizador no encontrado');
        }
        const isPasswordValid = await bcrypt.compare(password, organizador.password);
        if (!isPasswordValid) {
            return res.status(400).send('Contraseña incorrecta');
        }
        
        const token = jwt.sign( { id: organizador.id, email: organizador.email }, process.env.JWT_SECRET, { expiresIn: '1h' } );
        res.status(200).json({ message: 'Organizador logueado exitosamente', token });
    }
    catch(error){
        res.status(500).send(error.message);
    }
};

async function updateOrganizador(req, res) {
    const { email, password, newPassword, confirmNewPassword} = req.body;

    const userModel = Organizador(sequelize, Sequelize.DataTypes);
    if(password !== userModel.password){
        res.status(400).send('Las contraseñas no coinciden');
    }
    try{
        const userModel = Organizador(sequelize, Sequelize.DataTypes);
        const organizador = await Organizador.findOne({where :{email}});
        if(!organizador){
            res.status(404).send('Organizador no encontrado');
        }

        if(newPassword && confirmNewPassword){
            if(newPassword !== confirmNewPassword){
                return res.status(400).send('Las contraseñas no coinciden');
            }
            await userModel.update({password}, {where:{email}});
            return res.send('Contraseña actualizada exitosamente');
        }
        res.send('Organizador actualizado exitosamente');
    }
    catch(error){
        res.status(500).send(error.message);
    }
}

async function deleteOrganizador(req, res) {
    const { email } = req.body;
    try{
        const userModel = Organizador(sequelize, Sequelize.DataTypes);
        const user = await Organizador.findOne({where:{email}});
        if(!user){
            res.status(404).send('Organizador no encontrado');
        }
        await userModel.destroy({where:{email}});
        res.send('Organizador eliminado exitosamente');
    }
    catch(error){
        res.status(500).send(error.message);
    }
};

async function createEvento(req, res) {
    const { titulo, descripcion, precio, fecha, ubicacion, galeriaImagenes, categoryId } = req.body;
    try {
 
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).send('Token no proporcionado');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        const organizadorId = decoded.id; 

        const eventoModel = Evento(sequelize, Sequelize.DataTypes);

        const newEvento = await eventoModel.create({
            titulo,
            descripcion,
            precio,
            galeriaImagenes,
            fecha,
            ubicacion,
            categoryId,
            organizadorId 
        });

        res.status(201).json({ message: 'Evento creado exitosamente', event: newEvento });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send('Token inválido');
        }
        res.status(500).send(error.message);
    }
}

async function updateEvento(req, res) {
    const { id } = req.params;
    const { titulo, descripcion, precio, fecha, ubicacion, categoryId } = req.body;

    try {
        const eventoModel = Evento(sequelize, Sequelize.DataTypes);

        await eventoModel.update(
            { titulo, descripcion, precio, fecha, ubicacion, categoryId },
            { where: { id } }
        );

        res.status(200).send('Evento actualizado exitosamente');
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send('Token inválido');
        }
        res.status(500).send(error.message);
    }
}

async function deleteEvento(req, res) {
    const { id } = req.params;

    try {
        const eventoModel = Evento(sequelize, Sequelize.DataTypes);
        await eventoModel.destroy({ where: { id } });

        res.status(200).send('Evento eliminado exitosamente');
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send('Token inválido');
        }
        res.status(500).send(error.message);
    }
}

async function findOrganizadorByEmail(req, res) {
    const { email } = req.query; 

    try {
        const userModel = Organizador(sequelize, Sequelize.DataTypes);
        const user = await userModel.findOne({ where: { email } });

        if (!user) {
            return res.status(404).send('Organizador no encontrado');
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
}

module.exports = { getAllOrganizadores, createOrganizador, updateOrganizador, deleteOrganizador, loginOrganizador, createEvento, updateEvento, deleteEvento, findOrganizadorByEmail };