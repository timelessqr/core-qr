// ====================================
// src/modules/media/services/mediaService.js
// ====================================
const mediaRepository = require('../repositories/mediaRepository');
const profileRepository = require('../../profiles/repositories/profileRepository');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log(`☁️ MediaService usando Cloudinary directamente: ${process.env.CLOUDINARY_CLOUD_NAME}`);

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

      const hasSuccessfulUploads = uploadedMedia.length > 0;
      const hasErrors = errors.length > 0;

      return {
        success: hasSuccessfulUploads, // True si al menos uno se subió exitosamente
        totalUploaded: uploadedMedia.length,
        uploaded: uploadedMedia,
        errors,
        mensaje: hasSuccessfulUploads 
          ? `${uploadedMedia.length} archivo(s) subido(s) exitosamente${hasErrors ? ` (${errors.length} error(es))` : ''}`
          : `Error: No se pudo subir ningún archivo`
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
   * Procesar y subir un archivo individual - CLOUDINARY DIRECTO
   */
  async processAndUploadFile(profileId, file, metadata = {}) {
    try {
      // Validar archivo
      this.validateFile(file);

      // Determinar tipo de media
      const tipo = this.determineMediaType(file.mimetype);
      const isVideo = file.mimetype.startsWith('video/');
      const isAudio = file.mimetype.startsWith('audio/');
      
      // Generar nombre único para el archivo
      const uniqueFilename = this.generateUniqueFilename(file.originalname);
      
      // Crear ruta de destino en Cloudinary
      const folder = `memoriales/${profileId}/${tipo}s`;
      const fileNameWithoutExt = uniqueFilename.replace(/\.[^/.]+$/, '');
      const publicId = `${folder}/${fileNameWithoutExt}`;

      console.log(`☁️ Subiendo a Cloudinary: ${publicId}`);
      console.log('📊 Upload metadata recibido:', metadata);
      console.log('📊 Sección para este archivo:', metadata.seccion || 'galeria');
      console.log('📊 Tipo de archivo:', { tipo, isVideo, isAudio, mimetype: file.mimetype });

      // Configurar opciones de upload para Cloudinary
      const uploadOptions = {
        public_id: publicId,
        resource_type: (isVideo || isAudio) ? 'video' : 'image', // Cloudinary trata audio como 'video' resource_type
        overwrite: false,
        transformation: (isVideo || isAudio) ? [
          { quality: 'auto:best', video_codec: 'auto' }
        ] : [
          { quality: 'auto:best', fetch_format: 'auto' }
        ]
      };

      // Upload a Cloudinary
      let uploadResult;
      
      if (file.buffer) {
        // Si es buffer (multer en memoria)
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });
      } else if (file.path) {
        // Si es archivo temporal (multer en disco)
        uploadResult = await cloudinary.uploader.upload(file.path, uploadOptions);
      } else {
        throw new Error('Formato de archivo no soportado');
      }

      console.log(`✓ Upload exitoso: ${uploadResult.secure_url}`);

      // Procesar dimensiones si es imagen o duración si es audio/video
      let dimensiones = {};
      if (tipo === 'foto' && uploadResult.width && uploadResult.height) {
        dimensiones = { 
          ancho: uploadResult.width, 
          alto: uploadResult.height 
        };
      } else if ((tipo === 'video' || tipo === 'archivo_mp3') && uploadResult.duration) {
        dimensiones = {
          duracion: uploadResult.duration // Duración en segundos para audio/video
        };
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
          ruta: publicId, // Guardamos el public_id de Cloudinary
          url: uploadResult.secure_url,
          mimeType: file.mimetype,
          tamaño: uploadResult.bytes || file.size
        },
        dimensiones,
        metadata: {
          fechaOriginal: metadata.fechaOriginal ? new Date(metadata.fechaOriginal) : null,
          ubicacion: metadata.ubicacion || {},
          camara: metadata.camara || '',
          configuracion: metadata.configuracion || {},
          // Metadatos de Cloudinary
          cloudinary: {
            public_id: uploadResult.public_id,
            version: uploadResult.version,
            format: uploadResult.format,
            width: uploadResult.width,
            height: uploadResult.height,
            duration: uploadResult.duration // Para videos
          }
        },
        orden: metadata.orden || 0,
        esPortada: Boolean(metadata.esPortada),
        procesado: {
          estado: 'completado',
          versiones: {},
          fechaProcesado: new Date()
        }
      };

      console.log('📊 Datos que se guardarán en BD:', {
        memorial: profileId,
        tipo,
        seccion: metadata.seccion || 'galeria',
        titulo: metadata.titulo || '',
        url: uploadResult.secure_url
      });
      
      const media = await mediaRepository.create(mediaData);
      
      console.log('📊 Media guardado exitosamente:', {
        id: media._id,
        tipo: media.tipo,
        seccion: media.seccion,
        titulo: media.titulo
      });

      // Generar versiones optimizadas si es foto (Cloudinary automático)
      if (tipo === 'foto') {
        await this.generateImageVersions(media, uploadResult.public_id);
      }
      
      console.log('✅ Archivo subido exitosamente:', {
        tipo,
        seccion: metadata.seccion,
        url: uploadResult.secure_url,
        duracion: uploadResult.duration || 'N/A'
      });

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
        fechaSubida: media.createdAt,
        cloudinary: media.metadata.cloudinary
      };
    } catch (error) {
      console.error('❌ Error en processAndUploadFile:', error);
      throw error;
    }
  }

  /**
   * Generar versiones optimizadas de imágenes - DESHABILITADO PARA CONSERVAR CRÉDITOS
   */
  async generateImageVersions(media, publicId) {
    try {
      console.log(`☁️ Skipping automatic versions to conserve credits for: ${publicId}`);

      // OPCIÓN 1: Solo generar URLs sin transformaciones (no consume créditos extra)
      const versionUrls = {
        thumbnail: cloudinary.url(publicId),  // URL original, sin transformación
        small: cloudinary.url(publicId),     // URL original, sin transformación
        medium: cloudinary.url(publicId),    // URL original, sin transformación
        large: cloudinary.url(publicId)      // URL original, sin transformación
      };

      // OPCIÓN 2: Generar URLs con transformaciones pero SIN procesar (solo cuando se usen)
      // Los usuarios pueden usar estas URLs si las necesitan, pero no se procesan ahora
      const onDemandUrls = {
        thumbnailOnDemand: cloudinary.url(publicId, { 
          width: 150, height: 150, crop: 'thumb', quality: 'auto' 
        }),
        smallOnDemand: cloudinary.url(publicId, { 
          width: 400, height: 400, crop: 'limit', quality: 'auto' 
        }),
        mediumOnDemand: cloudinary.url(publicId, { 
          width: 800, height: 800, crop: 'limit', quality: 'auto' 
        }),
        largeOnDemand: cloudinary.url(publicId, { 
          width: 1200, height: 1200, crop: 'limit', quality: 'auto' 
        })
      };
        
      console.log(`✓ URLs generadas (sin procesamiento): original + on-demand options`);

      // Actualizar media con URLs disponibles (pero no procesadas)
      await mediaRepository.update(media._id, {
        'procesado.versiones': versionUrls,
        'procesado.onDemandVersions': onDemandUrls, // URLs disponibles para usar si se necesitan
        'procesado.estado': 'completado'
      });

      return versionUrls;
    } catch (error) {
      console.error('Error generando URLs de versiones:', error);
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
      console.log('📊 Backend MediaService.getByProfile - Iniciando');
      console.log('📊 ProfileId:', profileId);
      console.log('📊 UserId:', userId);
      console.log('📊 Filtros recibidos:', filters);
      
      // Verificar que el perfil existe y pertenece al usuario
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }
      
      console.log('📊 Memorial encontrado:', profile.nombre);

      // Si se especifica una sección, usar findBySection
      if (filters.seccion) {
        console.log('📊 Buscando por sección:', filters.seccion, 'tipo:', filters.tipo);
        
        const result = await mediaRepository.findBySection(profileId, filters.seccion, {
          tipo: filters.tipo,
          estado: filters.estado,
          page: filters.page || 1,
          limit: filters.limit || 50
        });
        
        console.log('📊 Resultado findBySection:', {
          total: result.total,
          mediaCount: result.media?.length,
          sampleMedia: result.media?.[0]
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
      console.log('📊 No se especificó sección, usando método original');
      return await this.getMediaByMemorial(profileId, filters);
    } catch (error) {
      console.error('❌ Backend MediaService.getByProfile - Error:', error);
      throw error;
    }
  }

  /**
   * Obtener media público de un memorial - CON FILTROS PERFIL
   */
  async getPublicMedia(profileId, seccion = null) {
    try {
      console.log('🌍 PublicMedia - Iniciando para profileId:', profileId, 'seccion:', seccion);
      
      // Obtener datos del memorial para filtrar fotos de perfil
      const profileRepository = require('../../profiles/repositories/profileRepository');
      const memorial = await profileRepository.findById(profileId);
      
      const fotosPerfilUrls = [
        memorial?.fotoPerfil,
        memorial?.fotoJoven
      ].filter(Boolean); // Remover valores null/undefined
      
      console.log('🔍 URLs de fotos de perfil a filtrar:', fotosPerfilUrls);
      
      if (seccion) {
        console.log('🌍 Buscando sección específica:', seccion);
        
        // Si se especifica una sección, obtener solo esa sección
        const media = await mediaRepository.getPublicMedia(profileId, null, seccion);
        
        console.log('🌍 Media obtenido para', seccion, ':', media.length, 'items');
        if (media.length > 0) {
          console.log('🌍 Primer item:', {
            id: media[0].id,
            tipo: media[0].tipo,
            seccion: media[0].seccion,
            url: media[0].url?.substring(0, 50) + '...'
          });
        }
        
        // Filtrar fotos de perfil
        const mediaFiltrada = media.filter(item => {
          if (item.tipo === 'foto') {
            const itemUrl = item.url || item.archivo?.url;
            return !fotosPerfilUrls.includes(itemUrl);
          }
          return true; // Mantener videos y otros tipos
        });
        
        console.log(`📊 Media ${seccion} original: ${media.length}, filtrada: ${mediaFiltrada.length}`);
        
        return {
          media: mediaFiltrada.map(item => this.formatMediaForPublic(item)),
          total: mediaFiltrada.length
        };
      }

      // Si no se especifica sección, obtener todo organizado por tipo
      const fotos = await mediaRepository.getPublicMedia(profileId, 'foto');
      const videos = await mediaRepository.getPublicMedia(profileId, 'video');
      const youtube = await mediaRepository.getPublicMedia(profileId, 'youtube');

      // Filtrar fotos de perfil de la galería
      const fotosFiltradas = fotos.filter(foto => {
        const fotoUrl = foto.url || foto.archivo?.url;
        return !fotosPerfilUrls.includes(fotoUrl);
      });
      
      console.log(`📊 Fotos originales: ${fotos.length}, filtradas: ${fotosFiltradas.length}`);
      console.log(`📊 URLs filtradas:`, fotosPerfilUrls);

      return {
        fotos: fotosFiltradas.map(foto => this.formatMediaForPublic(foto)),
        videos: videos.map(video => this.formatMediaForPublic(video)),
        musica: youtube.map(track => this.formatMediaForPublic(track)),
        totalFotos: fotosFiltradas.length,
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
   * Eliminar media - CLOUDINARY DIRECTO
   */
  async deleteMedia(mediaId, adminId) {
    try {
      console.log('🔍 Iniciando eliminación de media:', mediaId);
      
      const media = await mediaRepository.findById(mediaId);
      if (!media) {
        throw new Error('Media no encontrado');
      }

      console.log('🔍 Media encontrado:', { 
        id: media._id, 
        url: media.archivo?.url, 
        publicId: media.archivo?.ruta,
        tipo: media.tipo
      });

      // Eliminar de Cloudinary usando el public_id
      const publicId = media.archivo.ruta; // Guardamos el public_id en ruta
      
      if (publicId) {
        console.log(`☁️ Eliminando de Cloudinary: ${publicId}`);
        
        try {
          // Intentar eliminar como imagen primero
          let result;
          if (media.tipo === 'video') {
            result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
          } else {
            result = await cloudinary.uploader.destroy(publicId);
          }
          
          console.log(`✓ Eliminado de Cloudinary: ${result.result}`);
        } catch (cloudinaryError) {
          console.warn(`⚠️ Error eliminando de Cloudinary: ${cloudinaryError.message}`);
          // Continuar con soft delete aunque falle Cloudinary
        }
      }

      // HARD DELETE en base de datos (eliminación completa)
      await mediaRepository.hardDelete(mediaId);
      console.log('✅ Media eliminado completamente de la base de datos');
      
      return {
        mediaId,
        mensaje: 'Media eliminado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error completo en deleteMedia:', {
        error: error.message,
        stack: error.stack,
        mediaId
      });
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
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png']; // Solo JPG y PNG para imágenes
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
    const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes];

    if (!allowedTypes.includes(file.mimetype)) {
      if (file.mimetype.startsWith('image/')) {
        throw new Error('Solo se permiten archivos JPG y PNG para imágenes');
      } else if (file.mimetype.startsWith('audio/')) {
        throw new Error('Solo se permiten archivos MP3, WAV, OGG y M4A para audio');
      } else {
        throw new Error('Tipo de archivo no permitido');
      }
    }

    // Validar tamaño según tipo
    if (file.mimetype.startsWith('image/')) {
      const maxImageSize = 10 * 1024 * 1024; // 10MB para imágenes
      if (file.size > maxImageSize) {
        throw new Error('La imagen excede el tamaño máximo permitido (10MB)');
      }
    } else if (file.mimetype.startsWith('video/')) {
      const maxVideoSize = 50 * 1024 * 1024; // 50MB para videos (suficiente para 30 segundos en 1080p)
      if (file.size > maxVideoSize) {
        throw new Error('El video excede el tamaño máximo permitido (50MB)');
      }
    } else if (file.mimetype.startsWith('audio/')) {
      const maxAudioSize = 20 * 1024 * 1024; // 20MB para audio (suficiente para 5-7 minutos en calidad alta)
      if (file.size > maxAudioSize) {
        throw new Error('El archivo de audio excede el tamaño máximo permitido (20MB)');
      }
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
    } else if (mimetype.startsWith('audio/')) {
      return 'archivo_mp3';
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
   * Obtener dimensiones de imagen desde Cloudinary
   * (Ya no necesario, Cloudinary nos da las dimensiones directamente)
   */

  /**
   * Formatear media para admin
   */
  formatMediaForAdmin(media) {
    console.log('🔍 formatMediaForAdmin input:', media._id, media.titulo);
    
    const formatted = {
      _id: media._id, // Asegurar que _id esté presente
      id: media._id,  // También agregar id por compatibilidad
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
      fechaActualizacion: media.updatedAt,
      createdAt: media.createdAt, // Agregar para compatibilidad frontend
      url: media.archivo?.url // Agregar URL directa
    };
    
    console.log('🔍 formatMediaForAdmin output:', formatted._id, formatted.titulo);
    return formatted;
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