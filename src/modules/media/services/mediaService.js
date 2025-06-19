// ====================================
// src/modules/media/services/mediaService.js
// ====================================
const mediaRepository = require('../repositories/mediaRepository');
const compressionService = require('./compressionService');
const storageService = require('../../../services/storage/storageService');
const { PLANS, FORMATOS_PERMITIDOS, FILE_LIMITS, PROCESSING_STATUS } = require('../../../utils/constants');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class MediaService {
  /**
   * Subir archivos de media
   */
  async uploadFiles(files, profileId, userId, sectionInfo) {
    try {
      // Validar que el perfil existe y pertenece al usuario
      const profile = await Profile.findOne({ _id: profileId, usuario: userId });
      if (!profile) {
        throw new Error('Perfil no encontrado o no autorizado');
      }

      // Obtener plan del usuario
      const user = await User.findById(userId);
      const userPlan = PLANS[user.plan.toUpperCase()];

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          // Validar archivo individual
          await this.validateFile(file, profileId, userPlan);

          // Procesar archivo
          const mediaResult = await this.processFile(file, profileId, userId, sectionInfo);
          results.push(mediaResult);

        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      return {
        success: results,
        errors,
        totalUploaded: results.length,
        totalErrors: errors.length
      };

    } catch (error) {
      throw new Error(`Error subiendo archivos: ${error.message}`);
    }
  }

  /**
   * Procesar un archivo individual
   */
  async processFile(file, profileId, userId, sectionInfo) {
    try {
      // Determinar tipo de archivo
      const fileType = this.getFileType(file.mimetype);
      
      // Generar nombre único para el archivo
      const uniqueFilename = this.generateUniqueFilename(file.originalname);
      
      // Crear directorio de uploads si no existe
      const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Guardar archivo temporal
      const tempPath = path.join(uploadDir, uniqueFilename);
      await fs.writeFile(tempPath, file.buffer);

      // Crear registro inicial en base de datos
      const mediaData = {
        perfil: profileId,
        tipo: fileType,
        seccion: sectionInfo.seccion,
        nombreOriginal: file.originalname,
        archivo: {
          url: '', // Se llenará después del procesamiento
          tamaño: file.size,
          formato: path.extname(file.originalname).toLowerCase().replace('.', ''),
          calidad: 'original'
        },
        titulo: sectionInfo.titulo || '',
        descripcion: sectionInfo.descripcion || '',
        orden: sectionInfo.orden || 0,
        tags: sectionInfo.tags || [],
        estado: PROCESSING_STATUS.PENDING,
        uploadedBy: userId
      };

      const media = await mediaRepository.create(mediaData);

      // Procesar archivo en background (asíncrono)
      this.processFileAsync(media._id, tempPath, fileType)
        .catch(error => {
          console.error(`Error procesando archivo ${media._id}:`, error);
          // Marcar como error en la base de datos
          mediaRepository.update(media._id, {
            estado: PROCESSING_STATUS.ERROR,
            errorMessage: error.message
          });
        });

      return {
        id: media._id,
        filename: file.originalname,
        type: fileType,
        status: 'uploaded',
        message: 'Archivo subido, procesando...'
      };

    } catch (error) {
      throw new Error(`Error procesando archivo: ${error.message}`);
    }
  }

  /**
   * Procesar archivo de forma asíncrona
   */
  async processFileAsync(mediaId, tempPath, fileType) {
    try {
      // Crear directorio final
      const finalDir = path.join(process.cwd(), 'uploads', 'media', mediaId.toString());
      await fs.mkdir(finalDir, { recursive: true });

      // Optimizar archivo
      const optimizedResult = await compressionService.optimizeFile(
        tempPath,
        finalDir,
        path.basename(tempPath),
        fileType
      );

      // Subir archivos optimizados al storage (local o R2)
      const storageResults = await this.uploadOptimizedFiles(mediaId, optimizedResult, fileType);

      // Actualizar registro en base de datos con resultado final
      const updateData = {
        estado: PROCESSING_STATUS.COMPLETED,
        errorMessage: null
      };

      if (fileType === 'foto') {
        // Para fotos, usar la versión large como principal
        updateData.archivo = {
          url: storageResults.mainUrl,
          tamaño: storageResults.mainSize,
          formato: storageResults.format,
          dimensiones: storageResults.dimensions,
          calidad: 'optimizada',
          versions: storageResults.versions // URLs de todas las versiones
        };
      } else if (fileType === 'video') {
        // Para videos, usar el video comprimido
        updateData.archivo = {
          url: storageResults.videoUrl,
          tamaño: storageResults.videoSize,
          duracion: storageResults.duration,
          formato: 'mp4',
          dimensiones: storageResults.dimensions,
          calidad: '720p',
          thumbnailUrl: storageResults.thumbnailUrl
        };
      }

      await mediaRepository.update(mediaId, updateData);

      // Limpiar archivo temporal
      await fs.unlink(tempPath).catch(() => {}); // Ignore errors

      console.log(`Archivo ${mediaId} procesado exitosamente`);

    } catch (error) {
      console.error(`Error procesando archivo ${mediaId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener media por perfil con filtros
   */
  async getByProfile(profileId, userId, filters = {}) {
    try {
      // Validar que el perfil existe y pertenece al usuario
      const profile = await Profile.findOne({ _id: profileId, usuario: userId });
      if (!profile) {
        throw new Error('Perfil no encontrado o no autorizado');
      }

      const media = await mediaRepository.findByProfile(profileId, filters);
      
      // Agrupar por sección para mejor organización
      const groupedMedia = this.groupMediaBySection(media);

      return {
        profileId,
        profileName: `${profile.nombre} ${profile.apellido}`,
        media: groupedMedia,
        stats: await this.getProfileMediaStats(profileId)
      };

    } catch (error) {
      throw new Error(`Error obteniendo media: ${error.message}`);
    }
  }

  /**
   * Obtener media para display público (memorial)
   */
  async getPublicMedia(profileId, seccion = null) {
    try {
      let media;
      
      if (seccion) {
        media = await mediaRepository.findBySection(profileId, seccion);
      } else {
        media = await mediaRepository.findByProfile(profileId, { estado: 'completado' });
      }

      return this.formatPublicMedia(media);
    } catch (error) {
      throw new Error(`Error obteniendo media pública: ${error.message}`);
    }
  }

  /**
   * Actualizar información de media
   */
  async updateMedia(mediaId, userId, updates) {
    try {
      // Verificar que el media pertenece al usuario
      const media = await mediaRepository.findById(mediaId);
      if (!media || media.uploadedBy.toString() !== userId) {
        throw new Error('Media no encontrado o no autorizado');
      }

      // Validar updates permitidos
      const allowedUpdates = ['titulo', 'descripcion', 'orden', 'tags', 'seccion'];
      const filteredUpdates = {};
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const updatedMedia = await mediaRepository.update(mediaId, filteredUpdates);
      
      return {
        id: updatedMedia._id,
        message: 'Media actualizado exitosamente',
        data: updatedMedia
      };

    } catch (error) {
      throw new Error(`Error actualizando media: ${error.message}`);
    }
  }

  /**
   * Eliminar media
   */
  async deleteMedia(mediaId, userId) {
    try {
      // Verificar que el media pertenece al usuario
      const media = await mediaRepository.findById(mediaId);
      if (!media || media.uploadedBy.toString() !== userId) {
        throw new Error('Media no encontrado o no autorizado');
      }

      // Eliminar archivos físicos
      await this.deletePhysicalFiles(mediaId);

      // Eliminar registro de base de datos
      await mediaRepository.delete(mediaId);

      return {
        id: mediaId,
        message: 'Media eliminado exitosamente'
      };

    } catch (error) {
      throw new Error(`Error eliminando media: ${error.message}`);
    }
  }

  /**
   * Reordenar media en una sección
   */
  async reorderMedia(profileId, userId, sectionData) {
    try {
      // Validar que el perfil pertenece al usuario
      const profile = await Profile.findOne({ _id: profileId, usuario: userId });
      if (!profile) {
        throw new Error('Perfil no encontrado o no autorizado');
      }

      const { seccion, mediaIds, orders } = sectionData;

      if (mediaIds.length !== orders.length) {
        throw new Error('Los arrays de IDs y órdenes deben tener la misma longitud');
      }

      await mediaRepository.updateOrder(mediaIds, orders);

      return {
        message: 'Orden actualizado exitosamente',
        section: seccion,
        updatedItems: mediaIds.length
      };

    } catch (error) {
      throw new Error(`Error reordenando media: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de media del perfil
   */
  async getProfileMediaStats(profileId) {
    try {
      const stats = await mediaRepository.getMediaStats(profileId);
      const usedStorage = await mediaRepository.getUsedStorageByProfile(profileId);

      return {
        fotos: stats.fotos,
        videos: stats.videos,
        totalItems: stats.fotos.count + stats.videos.count,
        usedStorage,
        usedStorageMB: Math.round(usedStorage / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  /**
   * Validar archivo antes de procesar
   */
  async validateFile(file, profileId, userPlan) {
    // Validar tipo de archivo
    const fileType = this.getFileType(file.mimetype);
    if (!fileType) {
      throw new Error(`Tipo de archivo no permitido: ${file.mimetype}`);
    }

    // Validar tamaño
    const maxSize = fileType === 'foto' ? FILE_LIMITS.FOTO_MAX_SIZE : FILE_LIMITS.VIDEO_MAX_SIZE;
    if (file.size > maxSize) {
      throw new Error(`Archivo demasiado grande. Máximo: ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    // Validar límites del plan
    await this.validatePlanLimits(profileId, fileType, file.size, userPlan);
  }

  /**
   * Validar límites del plan
   */
  async validatePlanLimits(profileId, fileType, fileSize, userPlan) {
    const currentCount = await mediaRepository.countByProfileAndType(profileId, fileType);
    const currentStorage = await mediaRepository.getUsedStorageByProfile(profileId);

    // Verificar límite de cantidad
    const countLimit = fileType === 'foto' ? userPlan.limits.fotos : userPlan.limits.videos;
    if (currentCount >= countLimit) {
      throw new Error(`Límite de ${fileType}s alcanzado (${countLimit}). Actualiza tu plan.`);
    }

    // Verificar límite de almacenamiento
    if (currentStorage + fileSize > userPlan.limits.almacenamiento) {
      const limitMB = Math.round(userPlan.limits.almacenamiento / (1024 * 1024));
      throw new Error(`Límite de almacenamiento alcanzado (${limitMB}MB). Actualiza tu plan.`);
    }
  }

  /**
   * Determinar tipo de archivo
   */
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'foto';
    if (mimetype.startsWith('video/')) return 'video';
    return null;
  }

  /**
   * Generar nombre único para archivo
   */
  generateUniqueFilename(originalname) {
    const ext = path.extname(originalname);
    const uuid = uuidv4();
    return `${uuid}${ext}`;
  }

  /**
   * Agrupar media por sección
   */
  groupMediaBySection(mediaArray) {
    const grouped = {};
    
    mediaArray.forEach(media => {
      if (!grouped[media.seccion]) {
        grouped[media.seccion] = [];
      }
      grouped[media.seccion].push(media);
    });

    return grouped;
  }

  /**
   * Formatear media para display público
   */
  formatPublicMedia(mediaArray) {
    return mediaArray.map(media => ({
      id: media._id,
      tipo: media.tipo,
      url: media.archivo.url,
      titulo: media.titulo,
      descripcion: media.descripcion,
      dimensiones: media.archivo.dimensiones,
      duracion: media.archivo.duracion,
      thumbnailUrl: media.getThumbnailUrl(),
      orden: media.orden
    }));
  }

  /**
   * Eliminar archivos físicos
   */
  async deletePhysicalFiles(mediaId) {
    try {
      // Si estamos usando almacenamiento local, eliminar directorio
      const providerInfo = storageService.getProviderInfo();
      
      if (providerInfo.provider === 'Local Storage') {
        const mediaDir = path.join(process.cwd(), 'uploads', 'media', mediaId.toString());
        const fs = require('fs').promises;
        await fs.rm(mediaDir, { recursive: true, force: true });
      } else {
        // Si estamos usando R2, eliminar archivos individualmente
        // Esto requeriría conocer las rutas exactas de los archivos
        // Por ahora, dejamos que el método de eliminar individual maneje esto
        console.log(`Eliminación de archivos en ${providerInfo.provider} manejada individualmente`);
      }
    } catch (error) {
      console.error(`Error eliminando archivos físicos para media ${mediaId}:`, error);
      // No lanzar error aquí, solo log
    }
  }

  /**
   * Subir archivos optimizados al storage
   */
  async uploadOptimizedFiles(mediaId, optimizedResult, fileType) {
    try {
      if (fileType === 'foto') {
        // Subir todas las versiones de la imagen
        const versions = {};
        let mainVersion = null;
        let mainSize = 0;
        
        for (const [versionName, versionData] of Object.entries(optimizedResult.versions)) {
          const destinationPath = `media/${mediaId}/${mediaId}_${versionName}.jpg`;
          
          const uploadResult = await storageService.uploadFile(
            versionData.path,
            destinationPath,
            {
              contentType: 'image/jpeg',
              metadata: {
                'media-id': mediaId.toString(),
                'version': versionName,
                'width': versionData.width.toString(),
                'height': versionData.height.toString()
              }
            }
          );
          
          versions[versionName] = uploadResult.url;
          
          // La versión large es la principal
          if (versionName === 'large') {
            mainVersion = uploadResult;
            mainSize = versionData.size;
          }
        }
        
        return {
          mainUrl: mainVersion.url,
          mainSize: mainSize,
          format: 'jpeg',
          dimensions: {
            ancho: optimizedResult.mainVersion.width,
            alto: optimizedResult.mainVersion.height
          },
          versions
        };
        
      } else if (fileType === 'video') {
        // Subir video y thumbnail
        const videoPath = `media/${mediaId}/${mediaId}_video.mp4`;
        const thumbnailPath = `media/${mediaId}/${mediaId}_thumbnail.jpg`;
        
        const [videoUpload, thumbnailUpload] = await Promise.all([
          storageService.uploadFile(
            optimizedResult.video.path,
            videoPath,
            {
              contentType: 'video/mp4',
              metadata: {
                'media-id': mediaId.toString(),
                'type': 'video',
                'duration': optimizedResult.video.duration.toString(),
                'width': optimizedResult.video.width.toString(),
                'height': optimizedResult.video.height.toString()
              }
            }
          ),
          storageService.uploadFile(
            optimizedResult.thumbnail.path,
            thumbnailPath,
            {
              contentType: 'image/jpeg',
              metadata: {
                'media-id': mediaId.toString(),
                'type': 'thumbnail'
              }
            }
          )
        ]);
        
        return {
          videoUrl: videoUpload.url,
          videoSize: optimizedResult.video.size,
          duration: Math.round(optimizedResult.video.duration),
          dimensions: {
            ancho: optimizedResult.video.width,
            alto: optimizedResult.video.height
          },
          thumbnailUrl: thumbnailUpload.url
        };
      }
      
      throw new Error(`Tipo de archivo no soportado: ${fileType}`);
      
    } catch (error) {
      throw new Error(`Error subiendo archivos optimizados: ${error.message}`);
    }
  }
}

module.exports = new MediaService();