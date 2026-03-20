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

async function getUsers(req, res) {
    try {
        const users = await adminService.getUsersForAdmin();
        handleSuccess(res, {
            message: 'Usuarios obtenidos exitosamente',
            users
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        if (!rol) {
            const error = new Error('El campo rol es requerido');
            error.statusCode = 400;
            throw error;
        }

        const user = await adminService.updateUserRole(id, rol);
        handleSuccess(res, {
            message: 'Rol actualizado exitosamente',
            user
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function softDeleteUser(req, res) {
    try {
        const { id } = req.params;
        await adminService.softDeleteUser(id);
        handleSuccess(res, {
            message: 'Usuario desactivado exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = { createUserAdmin, loginAdminUser, getUsers, updateUserRole, softDeleteUser };