// ====================================
// src/modules/media/controllers/storageController.js
// ====================================
const storageService = require('../../../services/storage/storageService');
const { responseHelper } = require('../../../utils/responseHelper');

class StorageController {
  /**
   * Obtener información del proveedor de storage
   * GET /api/media/storage/info
   */
  async getProviderInfo(req, res) {
    try {
      const info = storageService.getProviderInfo();
      
      responseHelper.success(res, info, 'Información del proveedor obtenida');
    } catch (error) {
      console.error('Error obteniendo info del proveedor:', error);
      responseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Obtener estadísticas de uso de storage
   * GET /api/media/storage/stats
   */
  async getUsageStats(req, res) {
    try {
      const userId = req.user.id;
      
      const stats = await storageService.getUsageStats();
      
      // Agregar información específica del usuario si es necesario
      const response = {
        ...stats,
        user: userId,
        timestamp: new Date().toISOString()
      };
      
      responseHelper.success(res, response, 'Estadísticas de storage obtenidas');
    } catch (error) {
      console.error('Error obteniendo estadísticas de storage:', error);
      responseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Generar URL presignada para upload directo (solo R2)
   * POST /api/media/storage/presigned-url
   */
  async generatePresignedUrl(req, res) {
    try {
      const userId = req.user.id;
      const { 
        filePath, 
        contentType, 
        contentLength, 
        expiresIn = 3600,
        metadata 
      } = req.body;

      if (!filePath) {
        return responseHelper.error(res, 'La ruta del archivo es requerida', 400);
      }

      // Agregar el ID del usuario al path para organización
      const userFilePath = `users/${userId}/${filePath}`;

      const options = {
        expiresIn,
        contentType,
        contentLength,
        metadata: {
          'user-id': userId,
          'upload-source': 'presigned-url',
          ...metadata
        }
      };

      const result = await storageService.generatePresignedUrl(userFilePath, options);
      
      responseHelper.success(res, result, 'URL presignada generada exitosamente');

    } catch (error) {
      console.error('Error generando URL presignada:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Listar archivos del usuario
   * GET /api/media/storage/list
   */
  async listUserFiles(req, res) {
    try {
      const userId = req.user.id;
      const { 
        directory = '', 
        fileType, 
        limit = 50 
      } = req.query;

      // Limitar búsqueda a archivos del usuario
      const userDirectory = `users/${userId}/${directory}`;

      const options = {
        fileType,
        limit: Math.min(parseInt(limit), 100) // Máximo 100 archivos
      };

      const result = await storageService.listFiles(userDirectory, options);
      
      responseHelper.success(res, result, 'Archivos listados exitosamente');

    } catch (error) {
      console.error('Error listando archivos:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Verificar si un archivo existe
   * GET /api/media/storage/exists/:filePath
   */
  async checkFileExists(req, res) {
    try {
      const userId = req.user.id;
      const { filePath } = req.params;

      if (!filePath) {
        return responseHelper.error(res, 'La ruta del archivo es requerida', 400);
      }

      // Verificar solo archivos del usuario
      const userFilePath = `users/${userId}/${filePath}`;
      
      const exists = await storageService.fileExists(userFilePath);
      
      const response = {
        filePath: userFilePath,
        exists,
        checked: new Date().toISOString()
      };

      responseHelper.success(res, response, `Archivo ${exists ? 'existe' : 'no existe'}`);

    } catch (error) {
      console.error('Error verificando archivo:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener información de un archivo específico
   * GET /api/media/storage/file-info/:filePath
   */
  async getFileInfo(req, res) {
    try {
      const userId = req.user.id;
      const { filePath } = req.params;

      if (!filePath) {
        return responseHelper.error(res, 'La ruta del archivo es requerida', 400);
      }

      // Verificar solo archivos del usuario
      const userFilePath = `users/${userId}/${filePath}`;
      
      const fileInfo = await storageService.getFileInfo(userFilePath);
      
      responseHelper.success(res, fileInfo, 'Información de archivo obtenida');

    } catch (error) {
      console.error('Error obteniendo información de archivo:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Migrar archivos de local a R2 (función administrativa)
   * POST /api/media/storage/migrate-to-r2
   */
  async migrateToR2(req, res) {
    try {
      const userId = req.user.id;
      
      // Esta función sería para migrar archivos existentes
      // Implementar según necesidades específicas
      
      responseHelper.success(res, { 
        message: 'Función de migración no implementada aún',
        userId 
      });

    } catch (error) {
      console.error('Error en migración:', error);
      responseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Obtener URL de descarga para archivos privados
   * GET /api/media/storage/download-url/:filePath
   */
  async getDownloadUrl(req, res) {
    try {
      const userId = req.user.id;
      const { filePath } = req.params;
      const { 
        expiresIn = 3600,
        responseContentDisposition,
        responseContentType 
      } = req.query;

      if (!filePath) {
        return responseHelper.error(res, 'La ruta del archivo es requerida', 400);
      }

      // Solo permitir descargas de archivos del usuario
      const userFilePath = `users/${userId}/${filePath}`;

      // Si el storage service soporta URLs de descarga presignadas
      const providerInfo = storageService.getProviderInfo();
      
      if (providerInfo.provider === 'Cloudflare R2') {
        const r2Service = require('../../../services/storage/r2StorageService');
        
        const options = {
          expiresIn: parseInt(expiresIn),
          responseContentDisposition,
          responseContentType
        };

        const result = await r2Service.generateDownloadUrl(userFilePath, options);
        responseHelper.success(res, result, 'URL de descarga generada');
      } else {
        // Para storage local, retornar URL directa
        const fileUrl = await storageService.getFileUrl(userFilePath);
        responseHelper.success(res, fileUrl, 'URL de archivo obtenida');
      }

    } catch (error) {
      console.error('Error generando URL de descarga:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
}

module.exports = new StorageController();