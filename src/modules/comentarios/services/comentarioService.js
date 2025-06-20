// ====================================
// src/modules/comentarios/services/comentarioService.js
// ====================================
const comentarioRepository = require('../repositories/comentarioRepository');
const profileRepository = require('../../profiles/repositories/profileRepository');
const jwt = require('jsonwebtoken');

class ComentarioService {
  /**
   * Validar código de comentarios
   */
  async validarCodigo(qrCode, codigo) {
    try {
      // Obtener memorial por QR
      const qrService = require('../../qr/services/qrService');
      const qr = await qrService.getQRByCode(qrCode);
      
      if (!qr || qr.tipo !== 'profile') {
        throw new Error('Memorial no encontrado');
      }

      const profileId = qr.referencia && qr.referencia._id ? qr.referencia._id : qr.referencia;
      const profile = await profileRepository.findById(profileId);
      
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      // Validar código usando el método del modelo
      const validacion = profile.validarCodigoComentarios(codigo);
      
      if (validacion.valido) {
        // Generar token temporal para comentar (válido por 30 minutos)
        const token = jwt.sign(
          { 
            profileId: profile._id,
            qrCode: qrCode,
            codigo: codigo,
            type: 'comment_token'
          },
          process.env.JWT_SECRET,
          { expiresIn: '30m' }
        );

        return {
          valido: true,
          mensaje: validacion.mensaje,
          token,
          memorialNombre: profile.nombre
        };
      } else {
        return validacion;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Crear comentario
   */
  async crearComentario(comentarioData, token, reqInfo = {}) {
    try {
      // Verificar token temporal
      let tokenData;
      try {
        tokenData = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        throw new Error('Token inválido o expirado');
      }

      if (tokenData.type !== 'comment_token') {
        throw new Error('Token no válido para comentarios');
      }

      // Validar datos del comentario
      if (!comentarioData.nombre || comentarioData.nombre.trim().length < 2) {
        throw new Error('El nombre es requerido (mínimo 2 caracteres)');
      }

      if (!comentarioData.mensaje || comentarioData.mensaje.trim().length < 5) {
        throw new Error('El mensaje es requerido (mínimo 5 caracteres)');
      }

      // Crear comentario
      const nuevoComentario = await comentarioRepository.create({
        memorial: tokenData.profileId,
        nombre: comentarioData.nombre.trim(),
        mensaje: comentarioData.mensaje.trim(),
        relacion: comentarioData.relacion ? comentarioData.relacion.trim() : '',
        codigoUsado: tokenData.codigo,
        ip: reqInfo.ip || '',
        userAgent: reqInfo.userAgent || ''
      });

      return {
        id: nuevoComentario._id,
        nombre: nuevoComentario.nombre,
        mensaje: nuevoComentario.mensaje,
        relacion: nuevoComentario.relacion,
        fechaCreacion: nuevoComentario.createdAt,
        mensaje: 'Comentario publicado exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener comentarios públicos de un memorial
   */
  async getComentariosPublicos(profileId, options = {}) {
    try {
      const comentarios = await comentarioRepository.getPublicCommentsByMemorial(profileId, options);
      const total = await comentarioRepository.countByMemorial(profileId);

      return {
        comentarios,
        total,
        page: options.page || 1,
        limit: options.limit || 50,
        hasMore: comentarios.length === (options.limit || 50)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener comentarios para admin
   */
  async getComentariosAdmin(profileId, options = {}) {
    try {
      const comentarios = await comentarioRepository.getAdminCommentsByMemorial(profileId, options);
      const total = await comentarioRepository.countByMemorial(profileId, options.estado);
      const stats = await comentarioRepository.getStatsForMemorial(profileId);

      return {
        comentarios,
        total,
        stats,
        page: options.page || 1,
        limit: options.limit || 100
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar comentario (admin)
   */
  async eliminarComentario(comentarioId, adminId) {
    try {
      const comentario = await comentarioRepository.findById(comentarioId);
      if (!comentario) {
        throw new Error('Comentario no encontrado');
      }

      await comentarioRepository.delete(comentarioId);
      
      return {
        mensaje: 'Comentario eliminado exitosamente',
        comentarioId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Configurar código de comentarios (admin)
   */
  async configurarCodigoComentarios(profileId, configuracion, adminId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      const updates = {};
      
      if (configuracion.codigoComentarios !== undefined) {
        if (configuracion.codigoComentarios && configuracion.codigoComentarios.trim().length > 0) {
          updates.codigoComentarios = configuracion.codigoComentarios.trim();
        } else {
          updates.codigoComentarios = '';
        }
      }

      if (configuracion.comentariosHabilitados !== undefined) {
        updates.comentariosHabilitados = Boolean(configuracion.comentariosHabilitados);
      }

      if (configuracion.fechaLimiteComentarios !== undefined) {
        updates.fechaLimiteComentarios = configuracion.fechaLimiteComentarios ? 
          new Date(configuracion.fechaLimiteComentarios) : null;
      }

      const updatedProfile = await profileRepository.update(profileId, updates);

      return {
        codigoComentarios: updatedProfile.codigoComentarios,
        comentariosHabilitados: updatedProfile.comentariosHabilitados,
        fechaLimiteComentarios: updatedProfile.fechaLimiteComentarios,
        mensaje: 'Configuración de comentarios actualizada'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generar código automático
   */
  async generarCodigoAutomatico(profileId, adminId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      const nuevoCodigo = profile.generarCodigoComentarios();
      
      const updatedProfile = await profileRepository.update(profileId, {
        codigoComentarios: nuevoCodigo,
        comentariosHabilitados: true
      });

      return {
        codigoComentarios: nuevoCodigo,
        mensaje: 'Código generado automáticamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar comentarios
   */
  async buscarComentarios(profileId, searchTerm, options = {}) {
    try {
      const comentarios = await comentarioRepository.search(profileId, searchTerm, options);
      
      return {
        comentarios,
        searchTerm,
        total: comentarios.length,
        page: options.page || 1
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener configuración de comentarios para vista pública
   */
  async getConfiguracionPublica(profileId) {
    try {
      const profile = await profileRepository.findById(profileId);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      const total = await comentarioRepository.countByMemorial(profileId);

      return {
        habilitados: profile.comentariosHabilitados,
        requiereCodigo: Boolean(profile.codigoComentarios),
        totalComentarios: total,
        fechaLimite: profile.fechaLimiteComentarios,
        expirado: profile.fechaLimiteComentarios ? 
          new Date() > profile.fechaLimiteComentarios : false,
        mensaje: profile.comentariosHabilitados ? 
          'Para dejar una condolencia necesitas el código familiar' :
          'Los comentarios están deshabilitados'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ComentarioService();