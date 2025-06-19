// ====================================
// src/modules/media/controllers/mediaController.js
// ====================================
const mediaService = require('../services/mediaService');
const { responseHelper } = require('../../../utils/responseHelper');
const { MESSAGES } = require('../../../utils/constants');

class MediaController {
  /**
   * Subir archivos de media
   * POST /api/media/upload/:profileId
   */
  async uploadFiles(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const files = req.files;

      if (!files || files.length === 0) {
        return responseHelper.error(res, 'No se han subido archivos', 400);
      }

      // Obtener información de la sección del body
      const sectionInfo = {
        seccion: req.body.seccion,
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        orden: parseInt(req.body.orden) || 0,
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
      };

      // Validar sección requerida
      if (!sectionInfo.seccion) {
        return responseHelper.error(res, 'La sección es requerida', 400);
      }

      const result = await mediaService.uploadFiles(files, profileId, userId, sectionInfo);

      responseHelper.success(
        res,
        result,
        `${result.totalUploaded} archivo(s) subido(s) exitosamente`,
        201
      );

    } catch (error) {
      console.error('Error subiendo archivos:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener media de un perfil
   * GET /api/media/profile/:profileId
   */
  async getByProfile(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      
      // Filtros opcionales
      const filters = {
        tipo: req.query.tipo,
        seccion: req.query.seccion,
        estado: req.query.estado || 'completado'
      };

      const result = await mediaService.getByProfile(profileId, userId, filters);

      responseHelper.success(res, result, 'Media obtenido exitosamente');

    } catch (error) {
      console.error('Error obteniendo media del perfil:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Obtener media público para memorial
   * GET /api/media/public/:profileId
   */
  async getPublicMedia(req, res) {
    try {
      const { profileId } = req.params;
      const { seccion } = req.query;

      const result = await mediaService.getPublicMedia(profileId, seccion);

      responseHelper.success(res, result, 'Media público obtenido exitosamente');

    } catch (error) {
      console.error('Error obteniendo media público:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Obtener un media específico
   * GET /api/media/:mediaId
   */
  async getById(req, res) {
    try {
      const { mediaId } = req.params;
      const userId = req.user.id;

      // Para este endpoint, necesitamos implementar en el service
      // Por ahora, usaremos el repository directamente
      const mediaRepository = require('../repositories/mediaRepository');
      const media = await mediaRepository.findById(mediaId);

      if (!media || media.uploadedBy.toString() !== userId) {
        return responseHelper.error(res, 'Media no encontrado o no autorizado', 404);
      }

      responseHelper.success(res, media, 'Media obtenido exitosamente');

    } catch (error) {
      console.error('Error obteniendo media:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Actualizar información de media
   * PUT /api/media/:mediaId
   */
  async updateMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const result = await mediaService.updateMedia(mediaId, userId, updates);

      responseHelper.success(res, result, 'Media actualizado exitosamente');

    } catch (error) {
      console.error('Error actualizando media:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Eliminar media
   * DELETE /api/media/:mediaId
   */
  async deleteMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const userId = req.user.id;

      const result = await mediaService.deleteMedia(mediaId, userId);

      responseHelper.success(res, result, 'Media eliminado exitosamente');

    } catch (error) {
      console.error('Error eliminando media:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Reordenar media en una sección
   * PUT /api/media/reorder/:profileId
   */
  async reorderMedia(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const sectionData = req.body;

      if (!sectionData.seccion || !sectionData.mediaIds || !sectionData.orders) {
        return responseHelper.error(res, 'Datos de reordenamiento incompletos', 400);
      }

      const result = await mediaService.reorderMedia(profileId, userId, sectionData);

      responseHelper.success(res, result, 'Orden actualizado exitosamente');

    } catch (error) {
      console.error('Error reordenando media:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener estadísticas de media de un perfil
   * GET /api/media/stats/:profileId
   */
  async getProfileStats(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;

      // Verificar que el perfil pertenece al usuario
      const Profile = require('../../../models/Profile');
      const profile = await Profile.findOne({ _id: profileId, usuario: userId });
      if (!profile) {
        return responseHelper.error(res, 'Perfil no encontrado o no autorizado', 404);
      }

      const stats = await mediaService.getProfileMediaStats(profileId);

      responseHelper.success(res, stats, 'Estadísticas obtenidas exitosamente');

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener media por usuario (todos los perfiles)
   * GET /api/media/my-media
   */
  async getUserMedia(req, res) {
    try {
      const userId = req.user.id;
      
      // Filtros opcionales
      const filters = {
        tipo: req.query.tipo,
        estado: req.query.estado || 'completado'
      };

      const mediaRepository = require('../repositories/mediaRepository');
      const media = await mediaRepository.findByUser(userId, filters);

      responseHelper.success(res, media, 'Media del usuario obtenido exitosamente');

    } catch (error) {
      console.error('Error obteniendo media del usuario:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener estado de procesamiento de archivos
   * GET /api/media/processing-status
   */
  async getProcessingStatus(req, res) {
    try {
      const userId = req.user.id;

      const mediaRepository = require('../repositories/mediaRepository');
      const processingMedia = await mediaRepository.findByUser(userId, { 
        estado: 'procesando' 
      });

      const result = {
        processingCount: processingMedia.length,
        processingItems: processingMedia.map(media => ({
          id: media._id,
          filename: media.nombreOriginal,
          tipo: media.tipo,
          uploadedAt: media.createdAt
        }))
      };

      responseHelper.success(res, result, 'Estado de procesamiento obtenido');

    } catch (error) {
      console.error('Error obteniendo estado de procesamiento:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
}

module.exports = new MediaController();