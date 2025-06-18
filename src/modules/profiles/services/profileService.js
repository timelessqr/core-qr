const profileRepository = require('../repositories/profileRepository');
const qrService = require('../../qr/services/qrService');
const userRepository = require('../../auth/repositories/userRepository');
const { PLANS, MESSAGES } = require('../../../utils/constants');

class ProfileService {
  async create(profileData, userId) {
    try {
      // Verificar límites del plan del usuario
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);
      }
      
      const userProfiles = await profileRepository.findByUserId(userId);
      const planLimits = PLANS[user.plan.toUpperCase()]?.limits || PLANS.BASICO.limits;
      
      // Por ahora no limitamos número de perfiles, pero validamos biografía
      if (profileData.biografia && profileData.biografia.length > planLimits.biografia) {
        throw new Error(`La biografía no puede exceder ${planLimits.biografia} caracteres para el plan ${user.plan}`);
      }
      
      // Crear perfil
      const profileDataWithUser = {
        ...profileData,
        usuario: userId
      };
      
      const profile = await profileRepository.create(profileDataWithUser);
      
      // Auto-generar QR para el perfil
      try {
        const qrData = await qrService.createQRForProfile(profile._id, userId);
        
        // Vincular QR al perfil
        await profileRepository.linkQR(profile._id, qrData.id);
        
        // Agregar perfil al usuario
        await userRepository.update(userId, {
          $push: { perfiles: profile._id }
        });
        
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
          qr: {
            id: qrData.id,
            code: qrData.code,
            url: qrData.url,
            qrImage: qrData.qrImage
          },
          edadAlFallecer: this.calculateAge(profile.fechaNacimiento, profile.fechaFallecimiento),
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
  
  async getById(profileId, userId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error(MESSAGES.ERROR.PROFILE_NOT_FOUND);
      }
      
      // Verificar que el perfil pertenece al usuario
      if (profile.usuario._id.toString() !== userId) {
        throw new Error('No tienes permisos para ver este perfil');
      }
      
      return this.formatProfileResponse(profile);
    } catch (error) {
      throw error;
    }
  }
  
  async getUserProfiles(userId) {
    try {
      const profiles = await profileRepository.findByUserId(userId);
      
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
  
  async update(profileId, userId, updates) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error(MESSAGES.ERROR.PROFILE_NOT_FOUND);
      }
      
      // Verificar permisos
      if (profile.usuario._id.toString() !== userId) {
        throw new Error('No tienes permisos para actualizar este perfil');
      }
      
      // Validar biografía según plan del usuario
      if (updates.biografia) {
        const user = await userRepository.findById(userId);
        const planLimits = PLANS[user.plan.toUpperCase()]?.limits || PLANS.BASICO.limits;
        
        if (updates.biografia.length > planLimits.biografia) {
          throw new Error(`La biografía no puede exceder ${planLimits.biografia} caracteres para el plan ${user.plan}`);
        }
      }
      
      const updatedProfile = await profileRepository.update(profileId, updates);
      
      return this.formatProfileResponse(updatedProfile);
    } catch (error) {
      throw error;
    }
  }
  
  async delete(profileId, userId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error(MESSAGES.ERROR.PROFILE_NOT_FOUND);
      }
      
      // Verificar permisos
      if (profile.usuario._id.toString() !== userId) {
        throw new Error('No tienes permisos para eliminar este perfil');
      }
      
      // Desactivar perfil
      await profileRepository.delete(profileId);
      
      // TODO: También desactivar QR asociado
      
      return { message: 'Memorial eliminado exitosamente' };
    } catch (error) {
      throw error;
    }
  }
  
  // VERSIÓN ARREGLADA - Busca perfil directamente por ID
  async getPublicMemorial(profileId) {
    try {
      // Buscar perfil directamente por su ID
      const profile = await profileRepository.getPublicProfile(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado o no público');
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
      usuario: profile.usuario,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }
}

module.exports = new ProfileService();