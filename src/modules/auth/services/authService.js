// ====================================
// src/modules/auth/services/authService.js
// ====================================
const userRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');
const { SECURITY, MESSAGES, PLANS } = require('../../../utils/constants');

class AuthService {
  async register(userData) {
    try {
      // Verificar si el email ya existe
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error(MESSAGES.ERROR.USER_EXISTS);
      }
      
      // Crear usuario
      const user = await userRepository.create({
        ...userData,
        plan: 'basico' // Plan por defecto
      });
      
      // Generar token
      const token = this.generateToken(user._id);
      
      // Actualizar último login
      await userRepository.updateLastLogin(user._id);
      
      return {
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          plan: user.plan,
          fechaRegistro: user.createdAt
        },
        token,
        planLimits: PLANS[user.plan.toUpperCase()].limits
      };
    } catch (error) {
      throw error;
    }
  }
  
  async login(email, password) {
    try {
      // Buscar usuario
      const user = await userRepository.findByEmail(email);
      if (!user || !user.isActive) {
        throw new Error(MESSAGES.ERROR.INVALID_CREDENTIALS);
      }
      
      // Verificar password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error(MESSAGES.ERROR.INVALID_CREDENTIALS);
      }
      
      // Actualizar último login
      await userRepository.updateLastLogin(user._id);
      
      // Generar token
      const token = this.generateToken(user._id);
      
      return {
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          plan: user.plan,
          ultimoLogin: new Date()
        },
        token,
        planLimits: PLANS[user.plan.toUpperCase()].limits
      };
    } catch (error) {
      throw error;
    }
  }
  
  async getUserProfile(userId) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);
      }
      
      const stats = await userRepository.getUserStats(userId);
      
      return {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        plan: user.plan,
        perfiles: user.perfiles,
        stats,
        planLimits: PLANS[user.plan.toUpperCase()].limits
      };
    } catch (error) {
      throw error;
    }
  }
  
  async updateUserProfile(userId, updates) {
    try {
      const user = await userRepository.update(userId, updates);
      if (!user) {
        throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);
      }
      
      return {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        plan: user.plan
      };
    } catch (error) {
      throw error;
    }
  }
  
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await userRepository.findByEmail(userId);
      if (!user) {
        throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);
      }
      
      // Verificar contraseña actual
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }
      
      // Cambiar contraseña
      await userRepository.changePassword(userId, newPassword);
      
      return { message: 'Contraseña actualizada exitosamente' };
    } catch (error) {
      throw error;
    }
  }
  
  async upgradePlan(userId, newPlan) {
    try {
      if (!['basico', 'premium'].includes(newPlan)) {
        throw new Error('Plan inválido');
      }
      
      const user = await userRepository.update(userId, { plan: newPlan });
      if (!user) {
        throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);
      }
      
      return {
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          plan: user.plan
        },
        planLimits: PLANS[newPlan.toUpperCase()].limits
      };
    } catch (error) {
      throw error;
    }
  }
  
  generateToken(userId) {
    return jwt.sign(
      { userId }, 
      SECURITY.JWT_SECRET,
      { expiresIn: SECURITY.JWT_EXPIRES_IN }
    );
  }
  
  verifyToken(token) {
    try {
      return jwt.verify(token, SECURITY.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }
}

module.exports = new AuthService();