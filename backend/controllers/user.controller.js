const userService = require('../services/user.service');
const { handleSuccess, handleError } = require('../utils/responseHandler');

/**
 * Crea un nuevo usuario
 */
async function createUser(req, res) {
  try {
    const { email, fullName, password } = req.body;
    
    if (!email || !fullName || !password) {
      return res.status(400).json({ 
        message: 'Email, nombre completo y contraseña son requeridos' 
      });
    }

    const user = await userService.createUser({ email, fullName, password });
    
    handleSuccess(res, {
      message: 'User created successfully',
      user
    }, 201);
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Login con email y contraseña
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email y contraseña son requeridos' 
      });
    }

    const result = await userService.authenticateUser(email, password);
    
    handleSuccess(res, {
      message: 'User logged in successfully',
      ...result
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Login con Google
 * ✅ AQUÍ ESTÁ EL CAMBIO IMPORTANTE
 */
async function loginWithGoogle(req, res) {
  try {
    // ✅ FIX: El frontend envía 'photoURL', mapearlo a 'profileImage'
    const { email, fullName, photoURL } = req.body;
    
    console.log('📥 Request body completo:', req.body); // DEBUG
    console.log('📸 photoURL extraído:', photoURL); // DEBUG
    
    if (!email || !fullName) {
      return res.status(400).json({ 
        message: 'Email y nombre completo son requeridos' 
      });
    }
    
    // ✅ CAMBIO AQUÍ: Mapear photoURL -> profileImage
    const result = await userService.authenticateWithGoogle({ 
      email, 
      fullName, 
      profileImage: photoURL // ✅ Mapear correctamente
    });
    
    handleSuccess(res, {
      message: 'User logged in with Google successfully',
      ...result
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Obtiene el perfil del usuario autenticado
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.id; // Del middleware de autenticación
    
    const profile = await userService.getUserProfile(userId);
    
    handleSuccess(res, {
      message: 'Get user profile successfully',
      profile
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Actualiza el perfil del usuario autenticado
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const updatedUser = await userService.updateProfile(userId, updateData);
    
    handleSuccess(res, {
      message: 'User profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Actualiza la contraseña del usuario autenticado (requiere contraseña actual)
 */
async function updatePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Actual password and new password are required' 
      });
    }

    if (newPassword.length < 7) {
      return res.status(400).json({ 
        message: 'The new password must be at least 7 characters long' 
      });
    }
    
    await userService.updatePasswordSecure(userId, currentPassword, newPassword);
    
    handleSuccess(res, {
      message: 'Password updated successfully'
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Actualiza la contraseña del usuario (ANTIGUA - solo para admin)
 */
async function updateUser(req, res) {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        message: 'Email y nueva contraseña son requeridos' 
      });
    }
    
    await userService.updatePassword(email, newPassword);
    
    handleSuccess(res, {
      message: 'Password updated successfully'
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Añade un evento a favoritos
 */
async function addFavorite(req, res) {
  try {
    const userId = req.user.id;
    const { eventoId } = req.body;
    
    if (!eventoId) {
      return res.status(400).json({ 
        message: 'Event ID is required' 
      });
    }
    
    const favorito = await userService.addFavorite(userId, eventoId);
    
    handleSuccess(res, {
      message: 'Event added to favorites successfully',
      favorito
    }, 201);
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Elimina un evento de favoritos
 */
async function removeFavorite(req, res) {
  try {
    const userId = req.user.id;
    const { eventoId } = req.params;
    
    await userService.removeFavorite(userId, parseInt(eventoId));
    
    handleSuccess(res, {
      message: 'Event removed from favorites successfully'
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Obtiene los favoritos del usuario
 */
async function getFavorites(req, res) {
  try {
    const userId = req.user.id;
    
    const favoritos = await userService.getFavorites(userId);
    
    handleSuccess(res, {
      message: 'Get favorites successfully',
      favorites: favoritos
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Obtiene las órdenes del usuario
 */
async function getOrders(req, res) {
  try {
    const userId = req.user.id;
    const { estado } = req.query;
    
    const orders = await userService.getUserOrders(userId, estado);
    
    handleSuccess(res, {
      message: 'Get orders successfully',
      orders
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Obtiene todos los usuarios (admin)
 */
async function getAllUsers(req, res) {
  try {
    const users = await userService.getAllUsers();
    
    handleSuccess(res, {
      message: 'Get all users successfully',
      users
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Busca un usuario por email (admin)
 */
async function findUserByEmail(req, res) {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }
    
    const user = await userService.findByEmail(email);
    
    handleSuccess(res, {
      message: 'User found successfully',
      user
    });
  } catch (error) {
    handleError(res, error);
  }
}

/**
 * Elimina un usuario (admin)
 */
async function deleteUser(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }
    
    await userService.deleteUser(email);
    
    handleSuccess(res, {
      message: 'User deleted successfully'
    });
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = {
  createUser,
  loginUser,
  loginWithGoogle,
  getProfile,
  updateProfile,
  updatePassword,
  updateUser,
  addFavorite,
  removeFavorite,
  getFavorites,
  getOrders,
  getAllUsers,
  findUserByEmail,
  deleteUser
};
