// ====================================
// src/modules/auth/controllers/authController.js
// ====================================
const authService = require('../services/authService');
const { responseHelper } = require('../../../utils/responseHelper');
const { MESSAGES } = require('../../../utils/constants');

class AuthController {
  async register(req, res) {
    try {
      const { nombre, email, password, telefono } = req.body;
      
      const result = await authService.register({
        nombre,
        email, 
        password,
        telefono
      });
      
      responseHelper.success(
        res, 
        result, 
        MESSAGES.SUCCESS.USER_CREATED, 
        201
      );
    } catch (error) {
      console.error('Error en registro:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
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
  
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      const user = await authService.updateUserProfile(userId, updates);
      
      responseHelper.success(res, user, 'Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.changePassword(userId, currentPassword, newPassword);
      
      responseHelper.success(res, result, 'Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async upgradePlan(req, res) {
    try {
      const userId = req.user.id;
      const { plan } = req.body;
      
      const result = await authService.upgradePlan(userId, plan);
      
      responseHelper.success(res, result, 'Plan actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando plan:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async logout(req, res) {
    try {
      // En JWT no hay logout del lado del servidor, 
      // pero podemos dar una respuesta exitosa
      responseHelper.success(res, null, 'Logout exitoso');
    } catch (error) {
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async validateToken(req, res) {
    try {
      // Si llegamos aquí, el token es válido (gracias al middleware)
      const userId = req.user.id;
      const user = await authService.getUserProfile(userId);
      
      responseHelper.success(res, { valid: true, user }, 'Token válido');
    } catch (error) {
      responseHelper.error(res, 'Token inválido', 401);
    }
  }
}

module.exports = new AuthController();