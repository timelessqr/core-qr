const profileService = require('../services/profileService');
const { responseHelper } = require('../../../utils/responseHelper');
const { MESSAGES } = require('../../../utils/constants');

class ProfileController {
  async create(req, res) {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      
      const profile = await profileService.create(profileData, userId);
      
      responseHelper.success(
        res, 
        profile, 
        MESSAGES.SUCCESS.PROFILE_CREATED, 
        201
      );
    } catch (error) {
      console.error('Error creando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const profile = await profileService.getById(id, userId);
      
      responseHelper.success(res, profile, 'Perfil obtenido exitosamente');
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
  
  async getUserProfiles(req, res) {
    try {
      const userId = req.user.id;
      
      const profiles = await profileService.getUserProfiles(userId);
      
      responseHelper.success(res, profiles, 'Perfiles obtenidos exitosamente');
    } catch (error) {
      console.error('Error obteniendo perfiles del usuario:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;
      
      const profile = await profileService.update(id, userId, updates);
      
      responseHelper.success(res, profile, MESSAGES.SUCCESS.PROFILE_UPDATED);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await profileService.delete(id, userId);
      
      responseHelper.success(res, result, MESSAGES.SUCCESS.PROFILE_DELETED);
    } catch (error) {
      console.error('Error eliminando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  // Endpoint público para acceder al memorial vía QR
  async getByQR(req, res) {
    try {
      const { qrCode } = req.params;
      
      // Este método será llamado desde el QR controller
      // pero aquí está la lógica específica de perfiles
      const memorial = await profileService.getPublicMemorial(qrCode);
      
      responseHelper.success(res, memorial, 'Memorial encontrado');
    } catch (error) {
      console.error('Error obteniendo memorial público:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
}

module.exports = new ProfileController();