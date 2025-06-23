// ====================================
// src/modules/media/services/mediaService.js
// ====================================
const mediaRepository = require('../repositories/mediaRepository');
const profileRepository = require('../../profiles/repositories/profileRepository');
const storageService = require('../../../services/storage/storageService');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

class MediaService {
  /**
   * Subir archivos de media (compatible con frontend)
   */
  async uploadFiles(files, profileId, userId, sectionInfo) {
    try {
      // Verificar que el memorial existe
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      // Procesar archivos (puede ser uno o múltiples)
      const filesArray = Array.isArray(files) ? files : [files];
      const uploadedMedia = [];
      const errors = [];

      for (const file of filesArray) {
        try {
          const mediaData = await this.processAndUploadFile(profileId, file, {
            ...sectionInfo,
            seccion: sectionInfo.seccion || 'galeria'
          });
          uploadedMedia.push(mediaData);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      return {
        totalUploaded: uploadedMedia.length,
        uploaded: uploadedMedia,
        errors,
        mensaje: `${uploadedMedia.length} archivo(s) subido(s) exitosamente`
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subir archivo de media (método original para compatibilidad)
   */
  async uploadMedia(profileId, files, adminId, metadata = {}) {
    return await this.uploadFiles(files, profileId, adminId, metadata);
  }

  /**
   * Procesar y subir un archivo individual
   */
  async processAndUploadFile(profileId, file, metadata = {}) {
    try {
      // Validar archivo
      this.validateFile(file);

      // Determinar tipo de media
      const tipo = this.determineMediaType(file.mimetype);
      
      // Generar nombre único para el archivo
      const uniqueFilename = this.generateUniqueFilename(file.originalname);
      
      // Crear ruta de destino
      const destinationPath = `memoriales/${profileId}/${tipo}s/${uniqueFilename}`;

      // Subir archivo usando el storage service
      const uploadResult = await storageService.uploadFile(file, destinationPath, {
        contentType: file.mimetype
      });

      // Procesar dimensiones si es imagen
      let dimensiones = {};
      if (tipo === 'foto') {
        dimensiones = await this.getImageDimensions(file.buffer);
      }

      // Crear registro en base de datos
      const mediaData = {
        memorial: profileId,
        tipo,
        seccion: metadata.seccion || 'galeria',
        titulo: metadata.titulo || '',
        descripcion: metadata.descripcion || '',
        archivo: {
          nombreOriginal: file.originalname,
          nombreArchivo: uniqueFilename,
          ruta: destinationPath,
          url: uploadResult.url,
          mimeType: file.mimetype,
          tamaño: file.size
        },
        dimensiones,
        metadata: {
          fechaOriginal: metadata.fechaOriginal ? new Date(metadata.fechaOriginal) : null,
          ubicacion: metadata.ubicacion || {},
          camara: metadata.camara || '',
          configuracion: metadata.configuracion || {}
        },
        orden: metadata.orden || 0,
        esPortada: Boolean(metadata.esPortada),
        procesado: {
          estado: 'completado',
          versiones: {},
          fechaProcesado: new Date()
        }
      };

      const media = await mediaRepository.create(mediaData);

      // Generar versiones optimizadas si es foto
      if (tipo === 'foto') {
        await this.generateImageVersions(media, file.buffer);
      }

      return {
        id: media._id,
        tipo: media.tipo,
        seccion: media.seccion,
        titulo: media.titulo,
        descripcion: media.descripcion,
        url: media.archivo.url,
        dimensiones: media.dimensiones,
        orden: media.orden,
        esPortada: media.esPortada,
        fechaSubida: media.createdAt
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generar versiones optimizadas de imágenes
   */
  async generateImageVersions(media, imageBuffer) {
    try {
      const versions = ['thumbnail', 'small', 'medium', 'large'];
      const sizes = {
        thumbnail: { width: 150, height: 150 },
        small: { width: 400, height: 400 },
        medium: { width: 800, height: 800 },
        large: { width: 1200, height: 1200 }
      };

      const versionUrls = {};

      for (const version of versions) {
        try {
          const { width, height } = sizes[version];
          
          // Redimensionar imagen
          const resizedBuffer = await sharp(imageBuffer)
            .resize(width, height, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Crear archivo temporal para upload
          const versionFile = {
            buffer: resizedBuffer,
            mimetype: 'image/jpeg',
            size: resizedBuffer.length
          };

          // Generar ruta para la versión
          const versionPath = media.archivo.ruta.replace(
            path.extname(media.archivo.ruta),
            `_${version}.jpg`
          );

          // Subir versión
          const uploadResult = await storageService.uploadFile(versionFile, versionPath, {
            contentType: 'image/jpeg'
          });

          versionUrls[version] = uploadResult.url;
        } catch (versionError) {
          console.warn(`Error generando versión ${version}:`, versionError.message);
        }
      }

      // Actualizar media con las versiones generadas
      await mediaRepository.update(media._id, {
        'procesado.versiones': versionUrls,
        'procesado.estado': 'completado'
      });

      return versionUrls;
    } catch (error) {
      console.error('Error generando versiones de imagen:', error);
      throw error;
    }
  }

  /**
   * Obtener media de un memorial (para admin)
   */
  async getMediaByMemorial(profileId, options = {}) {
    try {
      const result = await mediaRepository.findByMemorial(profileId, options);
      
      return {
        media: result.media.map(item => this.formatMediaForAdmin(item)),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener media por perfil con filtros (compatibilidad con frontend)
   */
  async getByProfile(profileId, userId, filters = {}) {
    try {
      // Verificar que el perfil existe y pertenece al usuario
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      // Si se especifica una sección, usar findBySection
      if (filters.seccion) {
        const result = await mediaRepository.findBySection(profileId, filters.seccion, {
          tipo: filters.tipo,
          estado: filters.estado,
          page: filters.page || 1,
          limit: filters.limit || 50
        });
        
        return {
          media: result.media.map(item => this.formatMediaForAdmin(item)),
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev
          }
        };
      }

      // Si no se especifica sección, usar el método original
      return await this.getMediaByMemorial(profileId, filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener media público de un memorial
   */
  async getPublicMedia(profileId, seccion = null) {
    try {
      if (seccion) {
        // Si se especifica una sección, obtener solo esa sección
        const media = await mediaRepository.getPublicMedia(profileId, null, seccion);
        return {
          media: media.map(item => this.formatMediaForPublic(item)),
          total: media.length
        };
      }

      // Si no se especifica sección, obtener todo organizado por tipo
      const fotos = await mediaRepository.getPublicMedia(profileId, 'foto');
      const videos = await mediaRepository.getPublicMedia(profileId, 'video');
      const youtube = await mediaRepository.getPublicMedia(profileId, 'youtube');

      return {
        fotos: fotos.map(foto => this.formatMediaForPublic(foto)),
        videos: videos.map(video => this.formatMediaForPublic(video)),
        musica: youtube.map(track => this.formatMediaForPublic(track)),
        totalFotos: fotos.length,
        totalVideos: videos.length,
        totalMusica: youtube.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar media
   */
  async updateMedia(mediaId, updates, adminId) {
    try {
      const media = await mediaRepository.findById(mediaId);
      if (!media) {
        throw new Error('Media no encontrado');
      }

      const updatedMedia = await mediaRepository.update(mediaId, updates);
      
      return {
        id: updatedMedia._id,
        titulo: updatedMedia.titulo,
        descripcion: updatedMedia.descripcion,
        orden: updatedMedia.orden,
        esPortada: updatedMedia.esPortada,
        mensaje: 'Media actualizado exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar media
   */
  async deleteMedia(mediaId, adminId) {
    try {
      const media = await mediaRepository.findById(mediaId);
      if (!media) {
        throw new Error('Media no encontrado');
      }

      // Soft delete primero
      await mediaRepository.delete(mediaId);

      // TODO: Programar eliminación física del archivo después de X días
      
      return {
        mediaId,
        mensaje: 'Media eliminado exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reordenar media
   */
  async reorderMedia(profileId, newOrder, adminId) {
    try {
      await mediaRepository.reorderMedia(profileId, newOrder);
      
      return {
        mensaje: 'Orden actualizado exitosamente',
        newOrder
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Establecer portada
   */
  async setPortada(mediaId, adminId) {
    try {
      const media = await mediaRepository.findById(mediaId);
      if (!media) {
        throw new Error('Media no encontrado');
      }

      await mediaRepository.setPortada(mediaId, media.memorial, media.tipo);
      
      return {
        mensaje: 'Portada establecida exitosamente',
        mediaId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de media
   */
  async getMediaStats(profileId) {
    try {
      const stats = await mediaRepository.getStats(profileId);
      
      return {
        ...stats,
        tamañoFormateado: this.formatFileSize(stats.tamañoTotal)
      };
    } catch (error) {
      throw error;
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  /**
   * Validar archivo
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No se proporcionó archivo');
    }

    // Validar tipos permitidos
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Tipo de archivo no permitido');
    }

    // Validar tamaño
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error('Archivo demasiado grande (máximo 100MB)');
    }
  }

  /**
   * Determinar tipo de media
   */
  determineMediaType(mimetype) {
    if (mimetype.startsWith('image/')) {
      return 'foto';
    } else if (mimetype.startsWith('video/')) {
      return 'video';
    } else {
      throw new Error('Tipo de archivo no soportado');
    }
  }

  /**
   * Generar nombre único de archivo
   */
  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const uuid = uuidv4();
    const timestamp = Date.now();
    
    // Limpiar nombre original
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    
    return `${cleanName}_${timestamp}_${uuid}${ext}`;
  }

  /**
   * Obtener dimensiones de imagen
   */
  async getImageDimensions(imageBuffer) {
    try {
      const { width, height } = await sharp(imageBuffer).metadata();
      return { ancho: width, alto: height };
    } catch (error) {
      console.warn('Error obteniendo dimensiones:', error.message);
      return {};
    }
  }

  /**
   * Formatear media para admin
   */
  formatMediaForAdmin(media) {
    return {
      id: media._id,
      tipo: media.tipo,
      titulo: media.titulo,
      descripcion: media.descripcion,
      archivo: media.archivo,
      dimensiones: media.dimensiones,
      orden: media.orden,
      esPortada: media.esPortada,
      estaActivo: media.estaActivo,
      procesado: media.procesado,
      estadisticas: media.estadisticas,
      fechaSubida: media.createdAt,
      fechaActualizacion: media.updatedAt
    };
  }

  /**
   * Formatear media para público
   */
  formatMediaForPublic(media) {
    return {
      id: media._id || media.id,
      tipo: media.tipo,
      titulo: media.titulo,
      descripcion: media.descripcion,
      url: media.url,
      urlThumbnail: media.urlThumbnail,
      urlMedium: media.urlMedium,
      dimensiones: media.dimensiones,
      orden: media.orden,
      esPortada: media.esPortada,
      fechaSubida: media.fechaSubida,
      fechaOriginal: media.fechaOriginal
    };
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===============================
  // MÉTODOS ESPECÍFICOS PARA FRONTEND
  // ===============================

  /**
   * Agregar track de YouTube
   */
  async addYouTubeTrack(profileId, trackData) {
    try {
      // Verificar que el memorial existe
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      // Crear registro de media para YouTube
      const mediaData = {
        memorial: profileId,
        tipo: 'youtube',
        seccion: 'musica',
        titulo: trackData.titulo,
        descripcion: trackData.descripcion,
        archivo: {
          nombreOriginal: `YouTube - ${trackData.titulo}`,
          nombreArchivo: `youtube_${trackData.videoId}`,
          ruta: trackData.url,
          url: trackData.url,
          mimeType: 'video/youtube',
          tamaño: 0
        },
        metadata: {
          videoId: trackData.videoId,
          thumbnail: `https://img.youtube.com/vi/${trackData.videoId}/maxresdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${trackData.videoId}`
        },
        orden: 0,
        procesado: {
          estado: 'completado',
          versiones: {},
          fechaProcesado: new Date()
        }
      };

      const media = await mediaRepository.create(mediaData);

      return {
        id: media._id,
        tipo: media.tipo,
        titulo: media.titulo,
        descripcion: media.descripcion,
        url: media.archivo.url,
        videoId: media.metadata.videoId,
        thumbnail: media.metadata.thumbnail,
        embedUrl: media.metadata.embedUrl,
        fechaSubida: media.createdAt
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar configuración de slideshow
   */
  async updateSlideshowConfig(profileId, userId, config) {
    try {
      // Por ahora, guardamos la configuración en el perfil
      // En el futuro se puede crear una colección separada para configuraciones
      const Profile = require('../../../models/Profile');
      
      const profile = await Profile.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      // Actualizar configuración de slideshow (se puede expandir el modelo Profile)
      const updatedProfile = await Profile.findByIdAndUpdate(
        profileId,
        { 
          'configuracion.slideshow': {
            autoplay: config.autoplay || false,
            interval: config.interval || 5000,
            transition: config.transition || 'fade'
          }
        },
        { new: true, upsert: true }
      );

      return {
        profileId,
        config: updatedProfile.configuracion?.slideshow || config,
        mensaje: 'Configuración de slideshow actualizada exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener configuración de slideshow
   */
  async getSlideshowConfig(profileId, userId) {
    try {
      const Profile = require('../../../models/Profile');
      
      const profile = await Profile.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      const defaultConfig = {
        autoplay: true,
        interval: 5000,
        transition: 'fade'
      };

      return {
        profileId,
        config: profile.configuracion?.slideshow || defaultConfig
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de media por perfil
   */
  async getProfileMediaStats(profileId) {
    try {
      const stats = await mediaRepository.getStats(profileId);
      
      // Obtener estadísticas por sección
      const sectionStats = await mediaRepository.getSectionStats(profileId);
      
      return {
        ...stats,
        sections: sectionStats,
        tamañoFormateado: this.formatFileSize(stats.tamañoTotal)
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MediaService();