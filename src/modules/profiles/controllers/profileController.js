const profileService = require('../services/profileService');
const { responseHelper } = require('../../../utils/responseHelper');
const { MESSAGES } = require('../../../utils/constants');

class ProfileController {
  /**
   * Crear perfil para un cliente (admin)
   */
  async create(req, res) {
    try {
      const { clientId } = req.body;
      const profileData = req.body;
      
      if (!clientId) {
        return responseHelper.error(res, 'El ID del cliente es requerido', 400);
      }
      
      const profile = await profileService.createFromAdmin(profileData, clientId);
      
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
  
  /**
   * Obtener perfil por ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const profile = await profileService.getById(id);
      
      responseHelper.success(res, profile, 'Perfil obtenido exitosamente');
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
  
  /**
   * Obtener perfiles de un cliente específico
   */
  async getClientProfiles(req, res) {
    try {
      const { clientId } = req.params;
      
      const profiles = await profileService.getClientProfiles(clientId);
      
      responseHelper.success(res, profiles, 'Perfiles del cliente obtenidos exitosamente');
    } catch (error) {
      console.error('Error obteniendo perfiles del cliente:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener todos los perfiles (admin)
   */
  async getAll(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || '',
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await profileService.getAllProfiles(options);
      
      responseHelper.success(res, result, 'Perfiles obtenidos exitosamente');
    } catch (error) {
      console.error('Error obteniendo todos los perfiles:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Actualizar perfil
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remover clientId de updates si viene
      delete updates.clientId;
      
      const profile = await profileService.update(id, updates);
      
      responseHelper.success(res, profile, MESSAGES.SUCCESS.PROFILE_UPDATED);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Actualizar datos específicos del memorial (como fotoJoven)
   */
  async updateMemorial(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await profileService.updateMemorial(id, updates);
      
      responseHelper.success(res, result, 'Memorial actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando memorial:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Eliminar perfil
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const result = await profileService.delete(id);
      
      responseHelper.success(res, result, MESSAGES.SUCCESS.PROFILE_DELETED);
    } catch (error) {
      console.error('Error eliminando perfil:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  /**
   * Endpoint público para acceder al memorial vía QR
   */
  async getPublicMemorial(req, res) {
    try {
      const { profileId } = req.params;
      
      const memorial = await profileService.getPublicMemorial(profileId);
      
      responseHelper.success(res, memorial, 'Memorial encontrado');
    } catch (error) {
      console.error('Error obteniendo memorial público:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Crear perfil con datos básicos (endpoint simple)
   */
  async createBasic(req, res) {
    try {
      const { clientId, nombre, fechaNacimiento, fechaFallecimiento } = req.body;
      
      if (!clientId || !nombre || !fechaNacimiento || !fechaFallecimiento) {
        return responseHelper.error(res, 'Datos básicos requeridos: clientId, nombre, fechaNacimiento, fechaFallecimiento', 400);
      }

      const profileData = {
        clientId,
        nombre,
        fechaNacimiento,
        fechaFallecimiento,
        biografia: req.body.biografia || '',
        frase: req.body.frase || ''
      };
      
      const profile = await profileService.createFromAdmin(profileData, clientId);
      
      responseHelper.success(
        res, 
        {
          id: profile.id,
          nombre: profile.nombre,
          qr: profile.qr
        }, 
        'Memorial creado exitosamente', 
        201
      );
    } catch (error) {
      console.error('Error creando memorial básico:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
}

module.exports = new ProfileController();
