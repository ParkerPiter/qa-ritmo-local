const adminService = require('../services/admin.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');

async function createUserAdmin(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            const error = new Error('Email y contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const admin = await adminService.createAdmin({ email, password });
        handleSuccess(res, {
            message: 'Administrador creado exitosamente',
            admin
        }, 201);
    } catch (error) {
        handleError(res, error);
    }
}

async function loginAdminUser(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            const error = new Error('Email y contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const result = await adminService.authenticateAdmin(email, password);
        handleSuccess(res, {
            message: 'Administrador logueado exitosamente',
            ...result
        });
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = { createUserAdmin, loginAdminUser };