// ====================================
// src/modules/auth/controllers/authController.js
// ====================================
const authService = require('../services/authService');
const { responseHelper } = require('../../../utils/responseHelper');
const { MESSAGES } = require('../../../utils/constants');

class AuthController {
  /**
   * Login de administrador
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login(email, password);
      
      responseHelper.success(res, result, MESSAGES.SUCCESS.LOGIN_SUCCESS);
    } catch (error) {
      console.error('Error en login:', error);
      responseHelper.error(res, error.message, 401);
    }
  }
  
  /**
   * Obtener perfil del admin autenticado
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await authService.getUserProfile(userId);
      
      responseHelper.success(res, user, 'Perfil obtenido exitosamente');
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
  
  /**
   * Actualizar perfil del admin
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      // Solo permitir actualizar campos específicos
      const allowedUpdates = ['nombre', 'telefono'];
      const filteredUpdates = {};
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });
      
      const user = await authService.updateUserProfile(userId, filteredUpdates);
      
      responseHelper.success(res, user, 'Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Cambiar contraseña del admin
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return responseHelper.error(res, 'Contraseña actual y nueva son requeridas', 400);
      }

      if (newPassword.length < 6) {
        return responseHelper.error(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
      }
      
      const result = await authService.changePassword(userId, currentPassword, newPassword);
      
      responseHelper.success(res, result, 'Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Logout (en JWT es solo informativo)
   */
  async logout(req, res) {
    try {
      // En JWT no hay logout del lado del servidor
      // El frontend debe eliminar el token
      responseHelper.success(res, {
        message: 'Sesión cerrada exitosamente',
        action: 'Elimine el token del almacenamiento local'
      }, 'Logout exitoso');
    } catch (error) {
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Validar token y obtener info del usuario
   */
  async validateToken(req, res) {
    try {
      // Si llegamos aquí, el token es válido (gracias al middleware)
      const userId = req.user.id;
      const user = await authService.getUserProfile(userId);
      
      responseHelper.success(res, { 
        valid: true, 
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          role: 'admin'
        },
        permissions: ['clients:read', 'clients:write', 'profiles:read', 'profiles:write', 'admin:all']
      }, 'Token válido');
    } catch (error) {
      responseHelper.error(res, 'Token inválido', 401);
    }
  }

  /**
   * Crear nuevo admin (futuro - solo super admin)
   */
  async createAdmin(req, res) {
    try {
      // TODO: Implementar cuando sea necesario
      // Verificar que el usuario actual sea super admin
      // Crear nuevo usuario admin
      responseHelper.error(res, 'Funcionalidad no implementada', 501);
    } catch (error) {
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Información del sistema para el admin
   */
  async getSystemInfo(req, res) {
    try {
      const info = {
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        admin: req.user.nombre,
        loginTime: new Date().toISOString(),
        permissions: {
          canManageClients: true,
          canManageProfiles: true,
          canManageMedia: true,
          canViewStats: true
        }
      };

      responseHelper.success(res, info, 'Información del sistema obtenida');
    } catch (error) {
      responseHelper.error(res, error.message, 500);
    }
  }
}

module.exports = new AuthController();
