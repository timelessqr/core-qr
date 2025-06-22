// ====================================
// src/modules/comentarios/controllers/comentarioController.js
// ====================================
const comentarioService = require('../services/comentarioService');
const { responseHelper } = require('../../../utils/responseHelper');

class ComentarioController {
  /**
   * Validar código de comentarios (público)
   * POST /api/memorial/:qrCode/validar-codigo
   */
  async validarCodigo(req, res) {
    try {
      const { qrCode } = req.params;
      const { codigoComentarios } = req.body;

      if (!codigoComentarios) {
        return responseHelper.error(res, 'El código de comentarios es requerido', 400);
      }

      const resultado = await comentarioService.validarCodigo(qrCode, codigoComentarios);

      if (resultado.valido) {
        responseHelper.success(res, {
          valido: true,
          token: resultado.token,
          nivel: resultado.nivel, // 🆕 Incluir nivel en respuesta
          permisos: resultado.permisos, // 🆕 Incluir permisos en respuesta
          memorialNombre: resultado.memorialNombre
        }, resultado.mensaje);
      } else {
        responseHelper.error(res, resultado.mensaje, 400);
      }
    } catch (error) {
      console.error('Error validando código:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Crear comentario (público con token)
   * POST /api/memorial/:qrCode/comentarios
   */
  async crearComentario(req, res) {
    try {
      const { qrCode } = req.params;
      const { nombre, mensaje, relacion, token } = req.body;

      if (!token) {
        return responseHelper.error(res, 'Token de validación requerido', 400);
      }

      const reqInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      };

      const comentario = await comentarioService.crearComentario(
        { nombre, mensaje, relacion },
        token,
        reqInfo
      );

      responseHelper.success(res, comentario, 'Comentario publicado exitosamente', 201);
    } catch (error) {
      console.error('Error creando comentario:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * 🆕 Crear respuesta a un comentario (público con token nivel 'cliente')
   * POST /api/memorial/:qrCode/comentarios/:comentarioId/responder
   */
  async crearRespuesta(req, res) {
    try {
      const { qrCode, comentarioId } = req.params;
      const { nombre, mensaje, relacion, token } = req.body;

      if (!token) {
        return responseHelper.error(res, 'Token de validación requerido', 400);
      }

      if (!comentarioId) {
        return responseHelper.error(res, 'ID del comentario padre requerido', 400);
      }

      const reqInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      };

      const respuesta = await comentarioService.crearRespuesta(
        comentarioId,
        { nombre, mensaje, relacion },
        token,
        reqInfo
      );

      responseHelper.success(res, respuesta, 'Respuesta publicada exitosamente', 201);
    } catch (error) {
      console.error('Error creando respuesta:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * 🆕 Dar like a un comentario (público)
   * POST /api/memorial/:qrCode/comentarios/:comentarioId/like
   */
  async darLike(req, res) {
    try {
      const { comentarioId } = req.params;

      if (!comentarioId) {
        return responseHelper.error(res, 'ID del comentario requerido', 400);
      }

      const resultado = await comentarioService.darLike(comentarioId);

      responseHelper.success(res, resultado, 'Like agregado exitosamente');
    } catch (error) {
      console.error('Error dando like:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener comentarios públicos de un memorial
   * GET /api/memorial/:qrCode/comentarios
   */
  async getComentariosPublicos(req, res) {
    try {
      const { qrCode } = req.params;
      const { page = 1, limit = 50, sortOrder = 'desc' } = req.query;

      // Obtener profileId desde QR
      const qrService = require('../../qr/services/qrService');
      const qr = await qrService.getQRByCode(qrCode);
      
      if (!qr || qr.tipo !== 'profile') {
        return responseHelper.error(res, 'Memorial no encontrado', 404);
      }

      const profileId = qr.referencia && qr.referencia._id ? qr.referencia._id : qr.referencia;
      
      // 🆕 Usar el nuevo método que incluye respuestas anidadas
      const resultado = await comentarioService.getComentariosConRespuestas(profileId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortOrder
      });

      responseHelper.success(res, resultado, 'Comentarios obtenidos exitosamente');
    } catch (error) {
      console.error('Error obteniendo comentarios:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Configurar código de comentarios (admin)
   * PUT /api/admin/profiles/:profileId/codigo-comentarios
   */
  async configurarCodigoComentarios(req, res) {
    try {
      const { profileId } = req.params;
      const adminId = req.user.id;
      const configuracion = req.body;

      const resultado = await comentarioService.configurarCodigoComentarios(
        profileId,
        configuracion,
        adminId
      );

      responseHelper.success(res, resultado, 'Configuración actualizada exitosamente');
    } catch (error) {
      console.error('Error configurando código:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Generar código automático (admin)
   * POST /api/admin/profiles/:profileId/generar-codigo
   */
  async generarCodigoAutomatico(req, res) {
    try {
      const { profileId } = req.params;
      const adminId = req.user.id;

      const resultado = await comentarioService.generarCodigoAutomatico(profileId, adminId);

      responseHelper.success(res, resultado, 'Código generado exitosamente');
    } catch (error) {
      console.error('Error generando código:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener comentarios para admin
   * GET /api/admin/profiles/:profileId/comentarios
   */
  async getComentariosAdmin(req, res) {
    try {
      const { profileId } = req.params;
      const { page = 1, limit = 100, estado = 'activo' } = req.query;

      const resultado = await comentarioService.getComentariosAdmin(profileId, {
        page: parseInt(page),
        limit: parseInt(limit),
        estado
      });

      responseHelper.success(res, resultado, 'Comentarios obtenidos exitosamente');
    } catch (error) {
      console.error('Error obteniendo comentarios admin:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Eliminar comentario (admin)
   * DELETE /api/admin/comentarios/:comentarioId
   */
  async eliminarComentario(req, res) {
    try {
      const { comentarioId } = req.params;
      const adminId = req.user.id;

      const resultado = await comentarioService.eliminarComentario(comentarioId, adminId);

      responseHelper.success(res, resultado, 'Comentario eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando comentario:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Buscar comentarios (admin)
   * GET /api/admin/profiles/:profileId/comentarios/search
   */
  async buscarComentarios(req, res) {
    try {
      const { profileId } = req.params;
      const { q: searchTerm, page = 1, limit = 50 } = req.query;

      if (!searchTerm) {
        return responseHelper.error(res, 'Término de búsqueda requerido', 400);
      }

      const resultado = await comentarioService.buscarComentarios(profileId, searchTerm, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      responseHelper.success(res, resultado, 'Búsqueda completada exitosamente');
    } catch (error) {
      console.error('Error buscando comentarios:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener configuración pública de comentarios
   * GET /api/memorial/:qrCode/comentarios/config
   */
  async getConfiguracionPublica(req, res) {
    try {
      const { qrCode } = req.params;

      // Obtener profileId desde QR
      const qrService = require('../../qr/services/qrService');
      const qr = await qrService.getQRByCode(qrCode);
      
      if (!qr || qr.tipo !== 'profile') {
        return responseHelper.error(res, 'Memorial no encontrado', 404);
      }

      const profileId = qr.referencia && qr.referencia._id ? qr.referencia._id : qr.referencia;
      
      const configuracion = await comentarioService.getConfiguracionPublica(profileId);

      responseHelper.success(res, configuracion, 'Configuración obtenida exitosamente');
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener estadísticas de comentarios (admin)
   * GET /api/admin/profiles/:profileId/comentarios/stats
   */
  async getEstadisticasComentarios(req, res) {
    try {
      const { profileId } = req.params;

      const comentarioRepository = require('../repositories/comentarioRepository');
      const stats = await comentarioRepository.getStatsForMemorial(profileId);

      responseHelper.success(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
}

module.exports = new ComentarioController();