const profileRepository = require('../repositories/profileRepository');
const qrService = require('../../qr/services/qrService');
const clientRepository = require('../../clients/repositories/clientRepository');
const { MESSAGES } = require('../../../utils/constants');

class ProfileService {
  async create(profileData, clientId) {
    try {
      // Verificar que el cliente existe
      const client = await clientRepository.findById(clientId);
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      
      // Crear perfil
      const profileDataWithClient = {
        ...profileData,
        cliente: clientId
      };
      
      const profile = await profileRepository.create(profileDataWithClient);
      
      // Auto-generar código de comentarios
      const codigoComentarios = profile.generarCodigoComentarios();
      await profileRepository.update(profile._id, {
        codigoComentarios,
        comentariosHabilitados: true
      });
      
      // 🔥 AUTO-CREAR DASHBOARD EN LA BASE DE DATOS
      const dashboardService = require('../../dashboard/services/dashboardService');
      try {
        await dashboardService.createDefault(profile._id, clientId);
        console.log('✅ Dashboard creado automáticamente para memorial:', profile._id);
      } catch (dashboardError) {
        console.warn('⚠️ Error creando dashboard automático:', dashboardError.message);
      }
      
      // Auto-generar QR para el perfil
      try {
        const qrData = await qrService.createQRForProfile(profile._id, clientId);
        
        // Vincular QR al perfil
        await profileRepository.linkQR(profile._id, qrData.id);
        
        return {
          id: profile._id,
          nombre: profile.nombre,
          fechaNacimiento: profile.fechaNacimiento,
          fechaFallecimiento: profile.fechaFallecimiento,
          fotoPerfil: profile.fotoPerfil,
          frase: profile.frase,
          ubicacion: profile.ubicacion,
          biografia: profile.biografia,
          profesion: profile.profesion,
          familia: profile.familia,
          codigoComentarios, // Incluir código generado
          qr: {
            id: qrData.id,
            code: qrData.code,
            url: qrData.url,
            qrImage: qrData.qrImage
          },
          edadAlFallecer: this.calculateAge(profile.fechaNacimiento, profile.fechaFallecimiento),
          cliente: {
            id: client._id,
            nombre: client.nombreCompleto,
            codigo: client.codigoCliente
          },
          createdAt: profile.createdAt
        };
      } catch (qrError) {
        console.warn('Error generando QR automático:', qrError.message);
        // Retornar perfil sin QR si falla la generación
        return {
          id: profile._id,
          nombre: profile.nombre,
          fechaNacimiento: profile.fechaNacimiento,
          fechaFallecimiento: profile.fechaFallecimiento,
          qr: null,
          error: 'QR no generado automáticamente'
        };
      }
    } catch (error) {
      throw error;
    }
  }
  
  async getById(profileId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error(MESSAGES.ERROR.PROFILE_NOT_FOUND);
      }
      
      return this.formatProfileResponse(profile);
    } catch (error) {
      throw error;
    }
  }
  
  async getClientProfiles(clientId) {
    try {
      // Verificar que el cliente existe
      await clientRepository.findById(clientId);
      
      const profiles = await profileRepository.findByClientId(clientId);
      
      return profiles.map(profile => ({
        id: profile._id,
        nombre: profile.nombre,
        fechaNacimiento: profile.fechaNacimiento,
        fechaFallecimiento: profile.fechaFallecimiento,
        fotoPerfil: profile.fotoPerfil,
        frase: profile.frase,
        qr: profile.qr ? {
          code: profile.qr.code,
          url: profile.qr.url,
          vistas: profile.qr.estadisticas?.vistas || 0,
          escaneos: profile.qr.estadisticas?.escaneos || 0
        } : null,
        edadAlFallecer: this.calculateAge(profile.fechaNacimiento, profile.fechaFallecimiento),
        isPublic: profile.isPublic,
        createdAt: profile.createdAt
      }));
    } catch (error) {
      throw error;
    }
  }
  
  async update(profileId, updates) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error(MESSAGES.ERROR.PROFILE_NOT_FOUND);
      }
      
      const updatedProfile = await profileRepository.update(profileId, updates);
      
      return this.formatProfileResponse(updatedProfile);
    } catch (error) {
      throw error;
    }
  }
  
  async delete(profileId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error(MESSAGES.ERROR.PROFILE_NOT_FOUND);
      }
      
      console.log('🗑️ Eliminando memorial y registros asociados:', profileId);
      
      // 1. Eliminar QR asociado si existe
      if (profile.qr) {
        try {
          const qrRepository = require('../../qr/repositories/qrRepository');
          await qrRepository.hardDelete(profile.qr._id || profile.qr);
          console.log('✅ QR eliminado:', profile.qr._id || profile.qr);
        } catch (qrError) {
          console.warn('⚠️ Error eliminando QR:', qrError.message);
        }
      }
      
      // 2. Eliminar dashboard asociado si existe
      try {
        const dashboardRepository = require('../../dashboard/repositories/dashboardRepository');
        await dashboardRepository.deleteByProfileId(profileId);
        console.log('✅ Dashboard eliminado para profile:', profileId);
      } catch (dashboardError) {
        console.warn('⚠️ Error eliminando dashboard:', dashboardError.message);
      }
      
      // 3. Eliminar comentarios asociados si existen
      try {
        const Comentario = require('../../../models/Comentario');
        await Comentario.deleteMany({ memorial: profileId });
        console.log('✅ Comentarios eliminados para profile:', profileId);
      } catch (commentError) {
        console.warn('⚠️ Error eliminando comentarios:', commentError.message);
      }
      
      // 4. Eliminar media asociada si existe
      try {
        const Media = require('../../../models/Media');
        await Media.deleteMany({ profile: profileId });
        console.log('✅ Media eliminada para profile:', profileId);
      } catch (mediaError) {
        console.warn('⚠️ Error eliminando media:', mediaError.message);
      }
      
      // 5. Finalmente, eliminar el perfil completamente
      await profileRepository.hardDelete(profileId);
      console.log('✅ Memorial eliminado completamente:', profileId);
      
      return { message: 'Memorial y todos sus datos asociados eliminados exitosamente' };
    } catch (error) {
      console.error('❌ Error en delete completo:', error);
      throw error;
    }
  }
  
  // Buscar perfil directamente por ID para acceso público
  async getPublicMemorial(profileId) {
    try {
      const profile = await profileRepository.getPublicProfile(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado o no público');
      }
      
      // Obtener media del memorial (fotos y videos)
      const mediaService = require('../../media/services/mediaService');
      const mediaData = await mediaService.getPublicMedia(profileId);
      
      // Obtener configuración de dashboard
      const dashboardService = require('../../dashboard/services/dashboardService');
      let dashboardData = null;
      try {
        dashboardData = await dashboardService.getPublicDashboard(profileId);
      } catch (dashError) {
        console.warn('Dashboard no encontrado, usando configuración por defecto');
      }
      
      return {
        id: profile._id,
        nombre: profile.nombre,
        fechaNacimiento: profile.fechaNacimiento,
        fechaFallecimiento: profile.fechaFallecimiento,
        fotoPerfil: profile.fotoPerfil,
        frase: profile.frase,
        ubicacion: profile.ubicacion,
        biografia: profile.biografia,
        profesion: profile.profesion,
        familia: profile.familia,
        edadAlFallecer: this.calculateAge(profile.fechaNacimiento, profile.fechaFallecimiento),
        añosTranscurridos: this.calculateYearsSince(profile.fechaFallecimiento),
        // 🔥 NUEVA SECCIÓN: MEDIA
        galeria: mediaData.fotos || [],
        videos: mediaData.videos || [],
        estadisticasMedia: {
          totalFotos: mediaData.totalFotos || 0,
          totalVideos: mediaData.totalVideos || 0
        },
        // 🔥 NUEVA SECCIÓN: DASHBOARD
        dashboard: dashboardData || {
          tema: 'clasico',
          colorPrimario: '#8B4513',
          colorSecundario: '#F5F5DC',
          secciones: ['biografia', 'galeria_fotos', 'videos_memoriales', 'condolencias']
        },
        qr: profile.qr ? {
          code: profile.qr.code,
          vistas: profile.qr.estadisticas?.vistas || 0,
          escaneos: profile.qr.estadisticas?.escaneos || 0
        } : null
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los perfiles (para admin)
   */
  async getAllProfiles(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const profiles = await profileRepository.findAllWithClient({
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      return profiles;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Crear perfil desde admin (con clientId)
   */
  async createFromAdmin(profileData, clientId) {
    try {
      return await this.create(profileData, clientId);
    } catch (error) {
      throw error;
    }
  }
  
  calculateAge(birthDate, deathDate) {
    if (!birthDate || !deathDate) return null;
    
    const diffTime = Math.abs(new Date(deathDate) - new Date(birthDate));
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
  }
  
  calculateYearsSince(date) {
    if (!date) return null;
    
    const diffTime = Math.abs(new Date() - new Date(date));
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
  }
  
  formatProfileResponse(profile) {
    return {
      id: profile._id,
      nombre: profile.nombre,
      fechaNacimiento: profile.fechaNacimiento,
      fechaFallecimiento: profile.fechaFallecimiento,
      fotoPerfil: profile.fotoPerfil,
      frase: profile.frase,
      ubicacion: profile.ubicacion,
      biografia: profile.biografia,
      profesion: profile.profesion,
      familia: profile.familia,
      qr: profile.qr ? {
        id: profile.qr._id,
        code: profile.qr.code,
        url: profile.qr.url,
        vistas: profile.qr.estadisticas?.vistas || 0,
        escaneos: profile.qr.estadisticas?.escaneos || 0
      } : null,
      edadAlFallecer: this.calculateAge(profile.fechaNacimiento, profile.fechaFallecimiento),
      isPublic: profile.isPublic,
      cliente: profile.cliente,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }
}

module.exports = new ProfileService();
