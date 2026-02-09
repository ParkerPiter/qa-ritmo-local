const userService = require('../services/user.service');
const { handleError, handleSuccess } = require('../utils/responseHandler');

async function getAllUsers(req, res) {
    try {
        const users = await userService.getAllUsers();
        handleSuccess(res, { users });
    } catch (error) {
        handleError(res, error);
    }
}

async function createUser(req, res) {
    try {
        const { email, fullName, password } = req.body;
        
        if (!email || !fullName || !password) {
            const error = new Error('Email, nombre completo y contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const user = await userService.createUser({ email, fullName, password });
        handleSuccess(res, {
            message: 'Usuario creado exitosamente',
            user
        }, 201);
    } catch (error) {
        handleError(res, error);
    }
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            const error = new Error('Email y contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const result = await userService.authenticateUser(email, password);
        handleSuccess(res, {
            message: 'Usuario logueado exitosamente',
            ...result
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function loginWithGoogle(req, res) {
    try {
        const { email, fullName, profileImage } = req.body;
        
        if (!email || !fullName) {
            const error = new Error('Email y nombre completo son requeridos');
            error.statusCode = 400;
            throw error;
        }

        const result = await userService.authenticateWithGoogle({ email, fullName, profileImage });
        handleSuccess(res, {
            message: 'Usuario logueado con Google exitosamente',
            ...result
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function updateUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            const error = new Error('Email y nueva contraseña son requeridos');
            error.statusCode = 400;
            throw error;
        }

        await userService.updatePassword(email, password);
        handleSuccess(res, {
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function deleteUser(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            const error = new Error('Email es requerido');
            error.statusCode = 400;
            throw error;
        }

        await userService.deleteUser(email);
        handleSuccess(res, {
            message: 'Usuario eliminado exitosamente'
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

        const user = await userService.findByEmail(email);
        handleSuccess(res, { user });
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = { getAllUsers, createUser, updateUser, deleteUser, loginUser, loginWithGoogle, findUserByEmail };