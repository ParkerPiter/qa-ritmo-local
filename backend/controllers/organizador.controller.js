const organizadorService = require('../services/organizador.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

async function getAllOrganizadores(req, res) {
    try {
        const organizadores = await organizadorService.getAllOrganizadores();
        handleSuccess(res, { organizadores });
    } catch (error) {
        handleError(res, error);
    }
}

async function createOrganizador(req, res) {
    try {
        const { email, phone, password } = req.body;
        
        if (!email || !phone || !password) {
            const error = new Error('Todos los campos son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const organizador = await organizadorService.createOrganizador({ email, phone, password });
        handleSuccess(res, {
            message: 'Organizador creado exitosamente',
            organizador
        }, 201);
    } catch (error) {
        handleError(res, error);
    }
}

async function loginOrganizador(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            const error = new Error('Email y contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const result = await organizadorService.authenticateOrganizador(email, password);
        handleSuccess(res, {
            message: 'Organizador logueado exitosamente',
            ...result
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function updateOrganizador(req, res) {
    try {
        const { email, password, newPassword, confirmNewPassword } = req.body;

        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        await organizadorService.updateOrganizador(email, { 
            password, 
            newPassword, 
            confirmNewPassword 
        });
        
        handleSuccess(res, {
            message: 'Organizador actualizado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function deleteOrganizador(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        await organizadorService.deleteOrganizador(email);
        handleSuccess(res, {
            message: 'Organizador eliminado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function createEvento(req, res) {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            const error = new Error('Token no proporcionado');
            error.statusCode = 401;
            throw error;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        const organizadorId = decoded.id; 

        const evento = await organizadorService.createEvento(organizadorId, req.body);
        
        handleSuccess(res, {
            message: 'Evento creado exitosamente',
            event: evento
        }, 201);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            error.statusCode = 401;
            error.message = 'Token inválido';
        }
        handleError(res, error);
    }
}

async function updateEvento(req, res) {
    try {
        const { id } = req.params;
        
        if (!id) {
            const error = new Error('ID del evento es requerido');
            error.statusCode = 400;
            throw error;
        }

        await organizadorService.updateEvento(id, req.body);
        
        handleSuccess(res, {
            message: 'Evento actualizado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function deleteEvento(req, res) {
    try {
        const { id } = req.params;
        
        if (!id) {
            const error = new Error('ID del evento es requerido');
            error.statusCode = 400;
            throw error;
        }

        await organizadorService.deleteEvento(id);
        
        handleSuccess(res, {
            message: 'Evento eliminado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function findOrganizadorByEmail(req, res) {
    try {
        const { email } = req.query;
        
        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        const organizador = await organizadorService.findByEmail(email);
        handleSuccess(res, { organizador });
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = { 
    getAllOrganizadores, 
    createOrganizador, 
    updateOrganizador, 
    deleteOrganizador, 
    loginOrganizador, 
    createEvento, 
    updateEvento, 
    deleteEvento, 
    findOrganizadorByEmail 
};