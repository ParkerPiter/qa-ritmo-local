const advertiserService = require('../services/advertiser.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

async function getAllAdvertisers(req, res) {
    try {
        const advertisers = await advertiserService.getAllAdvertisers();
        handleSuccess(res, { advertisers });
    } catch (error) {
        handleError(res, error);
    }
}

async function createAdvertiser(req, res) {
    try {
        const { email, phone, password } = req.body;
        
        if (!email || !phone || !password) {
            const error = new Error('Todos los campos son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const advertiser = await advertiserService.createAdvertiser({ email, phone, password });
        handleSuccess(res, {
            message: 'Anunciante creado exitosamente',
            advertiser
        }, 201);
    } catch (error) {
        handleError(res, error);
    }
}

async function loginAdvertiser(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            const error = new Error('Email y contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const result = await advertiserService.authenticateAdvertiser(email, password);
        handleSuccess(res, {
            message: 'Anunciante logueado exitosamente',
            ...result
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function updateAdvertiser(req, res) {
    try {
        const { email, password, newPassword, confirmNewPassword } = req.body;

        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        await advertiserService.updateAdvertiser(email, { 
            password, 
            newPassword, 
            confirmNewPassword 
        });
        
        handleSuccess(res, {
            message: 'Anunciante actualizado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function deleteAdvertiser(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        await advertiserService.deleteAdvertiser(email);
        handleSuccess(res, {
            message: 'Anunciante eliminado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function createAd(req, res) {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            const error = new Error('Token no proporcionado');
            error.statusCode = 401;
            throw error;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        const advertiserId = decoded.id; 

        const ad = await advertiserService.createAd(advertiserId, req.body);
        
        handleSuccess(res, {
            message: 'Anuncio creado exitosamente',
            ad
        }, 201);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            error.statusCode = 401;
            error.message = 'Token inválido';
        }
        handleError(res, error);
    }
}

async function updateAd(req, res) {
    try {
        const { id } = req.params;
        
        if (!id) {
            const error = new Error('ID del anuncio es requerido');
            error.statusCode = 400;
            throw error;
        }

        await advertiserService.updateAd(id, req.body);
        
        handleSuccess(res, {
            message: 'Anuncio actualizado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function deleteAd(req, res) {
    try {
        const { id } = req.params;
        
        if (!id) {
            const error = new Error('ID del anuncio es requerido');
            error.statusCode = 400;
            throw error;
        }

        await advertiserService.deleteAd(id);
        
        handleSuccess(res, {
            message: 'Anuncio eliminado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function findUserByEmail(req, res) {
    try {
        const { email } = req.query;
        
        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        const advertiser = await advertiserService.findByEmail(email);
        handleSuccess(res, { advertiser });
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = { getAllAdvertisers, createAdvertiser, updateAdvertiser, deleteAdvertiser, loginAdvertiser, createAd, updateAd, deleteAd, findUserByEmail };