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

async function getRoleRequests(req, res) {
    try {
        const { estado } = req.query; // opcional: ?estado=pending
        const solicitudes = await adminService.getRoleRequests(estado || null);
        handleSuccess(res, { solicitudes });
    } catch (error) {
        handleError(res, error);
    }
}

async function resolveRoleRequest(req, res) {
    try {
        const { id } = req.params;
        const { decision } = req.body;

        if (!decision) {
            return res.status(400).json({ message: "El campo 'decision' es requerido ('approved' | 'rejected')" });
        }

        const solicitud = await adminService.resolveRoleRequest(id, decision);
        handleSuccess(res, {
            message: decision === 'approved' ? 'Solicitud aprobada y rol actualizado' : 'Solicitud rechazada',
            solicitud
        });
    } catch (error) {
        handleError(res, error);
    }
}

async function getRefunds(req, res) {
    try {
        const { page = 1, pageSize = 20, from = null, to = null, eventoId = null } = req.query;
        const data = await adminService.getRefundedOrders({
            page: parseInt(page, 10) || 1,
            pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
            from,
            to,
            eventoId: eventoId ? parseInt(eventoId, 10) : null
        });
        handleSuccess(res, data);
    } catch (error) {
        handleError(res, error);
    }
}

async function getRefundDetail(req, res) {
    try {
        const { id } = req.params;
        const data = await adminService.getRefundedOrderById(parseInt(id, 10));
        handleSuccess(res, data);
    } catch (error) {
        handleError(res, error);
    }
}

async function getDisputes(req, res) {
    try {
        const { limit = 25, starting_after = null } = req.query;
        const data = await adminService.getDisputesFromStripe({
            limit: parseInt(limit, 10) || 25,
            starting_after
        });
        handleSuccess(res, data);
    } catch (error) {
        handleError(res, error);
    }
}

module.exports = {
    createUserAdmin,
    loginAdminUser,
    getUsers,
    updateUserRole,
    softDeleteUser,
    getRoleRequests,
    resolveRoleRequest,
    getRefunds,
    getRefundDetail,
    getDisputes
};