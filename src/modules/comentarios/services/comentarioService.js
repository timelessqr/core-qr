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
      // Obtener el profile CON los métodos del schema (withMethods = true)
      const profile = await profileRepository.findById(profileId, true);
      
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      // Validar código usando el método del modelo
      const validacion = profile.validarCodigoComentarios(codigo);
      
      if (validacion.valido) {
        // Generar token temporal para comentar (válido por 2 minutos)
        const token = jwt.sign(
          { 
            profileId: profile._id,
            qrCode: qrCode,
            codigo: codigo,
            nivel: validacion.nivel,
            permisos: validacion.permisos,
            type: 'comment_token'
          },
          process.env.JWT_SECRET,
          { expiresIn: '2m' } // 🆕 Cambiado a 2 minutos
        );

        return {
          valido: true,
          mensaje: validacion.mensaje,
          token,
          nivel: validacion.nivel,
          permisos: validacion.permisos,
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
   * 🆕 Dar like a un comentario
   */
  async darLike(comentarioId) {
    try {
      const comentario = await comentarioRepository.findById(comentarioId);
      if (!comentario) {
        throw new Error('Comentario no encontrado');
      }

      if (comentario.estado !== 'activo') {
        throw new Error('No se puede dar like a un comentario eliminado');
      }

      // Incrementar likes
      const comentarioActualizado = await comentarioRepository.incrementLikes(comentarioId);

      return {
        id: comentarioActualizado._id,
        likes: comentarioActualizado.likes,
        mensaje: 'Like agregado correctamente'
      };
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

      // Crear comentario principal
      const nuevoComentario = await comentarioRepository.create({
        memorial: tokenData.profileId,
        nombre: comentarioData.nombre.trim(),
        mensaje: comentarioData.mensaje.trim(),
        relacion: comentarioData.relacion ? comentarioData.relacion.trim() : '',
        codigoUsado: tokenData.codigo,
        nivelUsuario: tokenData.nivel, // 🆕 Guardar el nivel del usuario
        esRespuesta: false, // 🆕 Es un comentario principal
        comentarioPadre: null, // 🆕 No tiene padre
        ip: reqInfo.ip || '',
        userAgent: reqInfo.userAgent || ''
      });

      return {
        id: nuevoComentario._id,
        nombre: nuevoComentario.nombre,
        mensaje: nuevoComentario.mensaje,
        relacion: nuevoComentario.relacion,
        nivelUsuario: nuevoComentario.nivelUsuario,
        esRespuesta: nuevoComentario.esRespuesta,
        fechaCreacion: nuevoComentario.createdAt,
        mensaje: 'Comentario publicado exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🆕 Crear respuesta a un comentario (solo nivel 'cliente')
   */
  async crearRespuesta(comentarioPadreId, respuestaData, token, reqInfo = {}) {
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

      // Verificar que el usuario tiene nivel 'cliente'
      if (tokenData.nivel !== 'cliente') {
        throw new Error('Solo el cliente puede responder a comentarios');
      }

      // Verificar que el comentario padre existe y no es una respuesta
      const comentarioPadre = await comentarioRepository.findById(comentarioPadreId);
      if (!comentarioPadre) {
        throw new Error('Comentario no encontrado');
      }

      if (comentarioPadre.esRespuesta) {
        throw new Error('No se puede responder a una respuesta');
      }

      // Validar datos de la respuesta
      if (!respuestaData.nombre || respuestaData.nombre.trim().length < 2) {
        throw new Error('El nombre es requerido (mínimo 2 caracteres)');
      }

      if (!respuestaData.mensaje || respuestaData.mensaje.trim().length < 5) {
        throw new Error('El mensaje es requerido (mínimo 5 caracteres)');
      }

      // Crear respuesta
      const nuevaRespuesta = await comentarioRepository.create({
        memorial: tokenData.profileId,
        nombre: respuestaData.nombre.trim(),
        mensaje: respuestaData.mensaje.trim(),
        relacion: respuestaData.relacion ? respuestaData.relacion.trim() : '',
        codigoUsado: tokenData.codigo,
        nivelUsuario: tokenData.nivel,
        esRespuesta: true, // 🆕 Es una respuesta
        comentarioPadre: comentarioPadreId, // 🆕 Referencia al comentario padre
        ip: reqInfo.ip || '',
        userAgent: reqInfo.userAgent || ''
      });

      return {
        id: nuevaRespuesta._id,
        nombre: nuevaRespuesta.nombre,
        mensaje: nuevaRespuesta.mensaje,
        relacion: nuevaRespuesta.relacion,
        nivelUsuario: nuevaRespuesta.nivelUsuario,
        esRespuesta: nuevaRespuesta.esRespuesta,
        comentarioPadre: nuevaRespuesta.comentarioPadre,
        fechaCreacion: nuevaRespuesta.createdAt,
        mensaje: 'Respuesta publicada exitosamente'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🆕 Obtener comentarios públicos con respuestas anidadas
   */
  async getComentariosConRespuestas(profileId, options = {}) {
    try {
      const Comentario = require('../../../models/Comentario');
      const comentarios = await Comentario.getCommentsWithReplies(profileId, options);
      const total = await Comentario.countByMemorial(profileId);

      return {
        comentarios,
        total,
        page: options.page || 1,
        limit: options.limit || 10,
        hasMore: comentarios.length === (options.limit || 10)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener comentarios públicos de un memorial (método legacy - mantenido para compatibilidad)
   */
  async getComentariosPublicos(profileId, options = {}) {
    try {
      // Usar el nuevo método que incluye respuestas
      return await this.getComentariosConRespuestas(profileId, options);
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
      const profile = await profileRepository.findById(profileId, true);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      const updates = {};
      
      // Actualizar código familiar
      if (configuracion.codigoComentarios !== undefined) {
        if (configuracion.codigoComentarios && configuracion.codigoComentarios.trim().length > 0) {
          updates.codigoComentarios = configuracion.codigoComentarios.trim();
        } else {
          updates.codigoComentarios = '';
        }
      }
      
      // 🆕 Actualizar código de cliente
      if (configuracion.codigoCliente !== undefined) {
        if (configuracion.codigoCliente && configuracion.codigoCliente.trim().length > 0) {
          updates.codigoCliente = configuracion.codigoCliente.trim();
        } else {
          updates.codigoCliente = '';
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
        codigoCliente: updatedProfile.codigoCliente,
        comentariosHabilitados: updatedProfile.comentariosHabilitados,
        fechaLimiteComentarios: updatedProfile.fechaLimiteComentarios,
        mensaje: 'Configuración de comentarios actualizada'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generar códigos automáticos (ambos)
   */
  async generarCodigoAutomatico(profileId, adminId) {
    try {
      // Obtener el profile CON los métodos del schema (withMethods = true)
      const profile = await profileRepository.findById(profileId, true);
      if (!profile) {
        throw new Error('Memorial no encontrado');
      }

      const nuevoCodigoFamiliar = profile.generarCodigoComentarios();
      const nuevoCodigoCliente = profile.generarCodigoCliente();
      
      const updatedProfile = await profileRepository.update(profileId, {
        codigoComentarios: nuevoCodigoFamiliar,
        codigoCliente: nuevoCodigoCliente,
        comentariosHabilitados: true
      });

      return {
        codigoComentarios: nuevoCodigoFamiliar,
        codigoCliente: nuevoCodigoCliente,
        mensaje: 'Códigos generados automáticamente'
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
      // Obtener el profile CON los métodos del schema (withMethods = true)
      const profile = await profileRepository.findById(profileId, true);
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