const { User, UserFav, Order, Evento, Categoria, Organizador } = require('../schemas');
const authService = require('./auth.service');
const orderService = require('./order.service');

class UserService {
  /**
   * Crea un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} Usuario creado (sin contraseña)
   */
  async createUser({ email, fullName, password }) {
    const hashedPassword = await authService.hashPassword(password);
    const user = await User.create({ 
      email, 
      password: hashedPassword, 
      fullName 
    });
    return authService.sanitizeEntity(user);
  }

  /**
   * Autentica un usuario
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Usuario y token
   */
  async authenticateUser(email, password) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (!user.password) {
      const error = new Error('User registered with Google. Please use Google login');
      error.statusCode = 400;
      throw error;
    }

    const isPasswordValid = await authService.comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      const error = new Error('Incorrect password');
      error.statusCode = 400;
      throw error;
    }

    const token = authService.generateToken({ 
      id: user.id, 
      email: user.email 
    }, 'user');

    return {
      token,
      user: authService.sanitizeEntity(user)
    };
  }

  /**
   * Autenticación con Google
   * @param {Object} googleData - Datos de Google (email, fullName, profileImage)
   * @returns {Promise<Object>} Usuario y token
   */
  async authenticateWithGoogle({ email, fullName, profileImage }) {
    console.log('🔍 Datos recibidos:', { email, fullName, profileImage });
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Crear nuevo usuario con la imagen de Google
      user = await User.create({ 
        email, 
        password: null, 
        fullName,
        profileImage: profileImage || null
      });
      console.log('✅ User created with profileImage:', user.profileImage);
    } else {
      // Actualizar usuario existente con nuevos datos de Google
       const updateData = { 
        fullName,
        profileImage: profileImage || null  // ← Cambio: Siempre actualizar, incluso si es null
      };
      await user.update(updateData);
      console.log('✅ Usuario actualizado. ProfileImage:', profileImage);
      user = await User.findOne({ where: { email } });
    }

    const token = authService.generateToken({ 
      id: user.id, 
      email: user.email 
    }, 'user');

    return {
      token,
      user: authService.sanitizeEntity(user)
    };
  }

  /**
   * Actualiza la contraseña de un usuario
   * @param {string} email - Email del usuario
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<void>}
   */
  async updatePassword(email, newPassword) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const hashedPassword = await authService.hashPassword(newPassword);
    await user.update({ password: hashedPassword });
  }

  /**
   * Obtiene el perfil completo de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Perfil completo del usuario
   */
  async getUserProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: UserFav,
          as: 'favoritos',
          include: [
            {
              model: Evento,
              as: 'evento',
              include: [
                {
                  model: Categoria,
                  as: 'Categorias',
                  attributes: ['id', 'nombre', 'tipo'],
                  through: { attributes: [] }
                },
                {
                  model: Organizador,
                  as: 'Organizador',
                  attributes: ['id', 'nombreCompleto', 'email']
                }
              ]
            }
          ]
        },
        {
          model: Order,
          as: 'orders',
          where: { estado: 'paid' },
          required: false,
          include: [
            {
              model: Evento,
              as: 'evento',
              include: [
                {
                  model: Categoria,
                  as: 'Categorias',
                  attributes: ['id', 'nombre', 'tipo'],
                  through: { attributes: [] }
                },
                {
                  model: Organizador,
                  as: 'Organizador',
                  attributes: ['id', 'nombreCompleto', 'email']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  /**
   * Actualiza el perfil de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  async updateProfile(userId, updateData) {
    const user = await User.findByPk(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Campos permitidos para actualizar
    const allowedFields = [
      'fullName',
      'phone',
      'location',
      'profileImage',
    ];

    const dataToUpdate = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    });

    await user.update(dataToUpdate);
    
    return authService.sanitizeEntity(user);
  }

  /**
   * Añade un evento a favoritos
   * @param {number} userId - ID del usuario
   * @param {number} eventoId - ID del evento
   * @returns {Promise<Object>} Favorito creado
   */
  async addFavorite(userId, eventoId) {
    // Verificar que el evento existe
    const evento = await Evento.findByPk(eventoId);
    if (!evento) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    // Verificar que no existe ya
    const existing = await UserFav.findOne({
      where: { userId, eventoId }
    });

    if (existing) {
      const error = new Error('The event is already in favorites');
      error.statusCode = 409;
      throw error;
    }

    const favorito = await UserFav.create({ userId, eventoId });
    
    return favorito;
  }

  /**
   * Elimina un evento de favoritos
   * @param {number} userId - ID del usuario
   * @param {number} eventoId - ID del evento
   * @returns {Promise<void>}
   */
  async removeFavorite(userId, eventoId) {
    const favorito = await UserFav.findOne({
      where: { userId, eventoId }
    });

    if (!favorito) {
      const error = new Error('Favorite not found');
      error.statusCode = 404;
      throw error;
    }

    await favorito.destroy();
  }

  /**
   * Obtiene los favoritos de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} Lista de favoritos
   */
  async getFavorites(userId) {
    const favoritos = await UserFav.findAll({
      where: { userId },
      include: [
        {
          model: Evento,
          as: 'evento',
          include: [
            {
              model: Categoria,
              as: 'Categorias',
              attributes: ['id', 'nombre', 'tipo'],
              through: { attributes: [] }
            },
            {
              model: Organizador,
              as: 'Organizador',
              attributes: ['id', 'nombreCompleto', 'email']
            }
          ]
        }
      ]
    });

    return favoritos;
  }

  /**
   * Obtiene los pedidos de un usuario
   * @param {number} userId - ID del usuario
   * @param {string} estado - Estado del pedido (opcional)
   * @returns {Promise<Array>} Lista de pedidos
   */
  async getUserOrders(userId, estado = 'paid') {
    // Delegar al servicio de órdenes para mantener la lógica centralizada
    return orderService.getUserOrders(userId, estado);
  }

  /**
   * Busca un usuario por email
   * @param {string} email - Email del usuario
   * @returns {Promise<Object>} Usuario encontrado
   */
  async findByEmail(email) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return authService.sanitizeEntity(user);
  }

  /**
   * Obtiene todos los usuarios
   * @returns {Promise<Array>} Lista de usuarios
   */
  async getAllUsers() {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    return users;
  }

  /**
   * Elimina un usuario
   * @param {string} email - Email del usuario
   * @returns {Promise<void>}
   */
  async deleteUser(email) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    await user.destroy();
  }
}

module.exports = new UserService();
