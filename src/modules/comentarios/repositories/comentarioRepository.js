// ====================================
// src/modules/comentarios/repositories/comentarioRepository.js
// ====================================
const Comentario = require('../../../models/Comentario');

class ComentarioRepository {
  /**
   * Crear un nuevo comentario o respuesta
   */
  async create(comentarioData) {
    try {
      const comentario = new Comentario(comentarioData);
      return await comentario.save();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🆕 Incrementar likes de un comentario
   */
  async incrementLikes(comentarioId) {
    try {
      return await Comentario.findByIdAndUpdate(
        comentarioId,
        { $inc: { likes: 1 } }, // Incrementar likes en 1
        { new: true } // Devolver el documento actualizado
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🆕 Obtener comentarios públicos con respuestas anidadas (usa el método del modelo)
   */
  async getPublicCommentsWithReplies(memorialId, options = {}) {
    try {
      return await Comentario.getCommentsWithReplies(memorialId, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener comentarios públicos de un memorial
   */
  async getPublicCommentsByMemorial(memorialId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      // 🆕 Solo obtener comentarios principales (no respuestas)
      const comentarios = await Comentario.find({
        memorial: memorialId,
        estado: 'activo',
        esRespuesta: false
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

      return comentarios.map(comentario => ({
        id: comentario._id,
        nombre: comentario.nombre,
        mensaje: comentario.mensaje,
        relacion: comentario.relacion,
        nivelUsuario: comentario.nivelUsuario,
        esRespuesta: comentario.esRespuesta,
        fechaCreacion: comentario.createdAt,
        fechaRelativa: this.getFechaRelativa(comentario.createdAt)
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener comentarios para el admin
   */
  async getAdminCommentsByMemorial(memorialId, options = {}) {
    try {
      const {
        page = 1,
        limit = 100,
        estado = 'activo'
      } = options;

      const skip = (page - 1) * limit;

      const comentarios = await Comentario.find({
        memorial: memorialId,
        estado
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

      return comentarios.map(comentario => ({
        id: comentario._id,
        nombre: comentario.nombre,
        mensaje: comentario.mensaje,
        relacion: comentario.relacion,
        codigoUsado: comentario.codigoUsado,
        ip: comentario.ip,
        userAgent: comentario.userAgent,
        fechaCreacion: comentario.createdAt,
        estado: comentario.estado
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Contar comentarios principales de un memorial (sin respuestas)
   */
  async countByMemorial(memorialId, estado = 'activo') {
    try {
      return await Comentario.countDocuments({
        memorial: memorialId,
        estado,
        esRespuesta: false // 🆕 Solo contar comentarios principales
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 🆕 Contar respuestas de un comentario específico
   */
  async countRepliesByComment(comentarioId) {
    try {
      return await Comentario.countDocuments({
        comentarioPadre: comentarioId,
        estado: 'activo',
        esRespuesta: true
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar comentario (soft delete)
   */
  async delete(comentarioId) {
    try {
      return await Comentario.findByIdAndUpdate(
        comentarioId,
        { estado: 'eliminado' },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener comentario por ID
   */
  async findById(comentarioId) {
    try {
      return await Comentario.findById(comentarioId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de comentarios
   */
  async getStatsForMemorial(memorialId) {
    try {
      const total = await this.countByMemorial(memorialId);
      
      // Comentarios por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const commentsByMonth = await Comentario.aggregate([
        {
          $match: {
            memorial: memorialId,
            estado: 'activo',
            createdAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Último comentario
      const ultimoComentario = await Comentario.findOne({
        memorial: memorialId,
        estado: 'activo'
      })
      .sort({ createdAt: -1 })
      .lean();

      return {
        total,
        commentsByMonth,
        ultimoComentario: ultimoComentario ? {
          nombre: ultimoComentario.nombre,
          fechaCreacion: ultimoComentario.createdAt
        } : null
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener fecha relativa (helper)
   */
  getFechaRelativa(fecha) {
    const ahora = new Date();
    const diferencia = ahora - fecha;
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 60) {
      return minutos === 1 ? 'hace 1 minuto' : `hace ${minutos} minutos`;
    } else if (horas < 24) {
      return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`;
    } else if (dias < 30) {
      return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
    } else {
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  /**
   * Buscar comentarios por texto
   */
  async search(memorialId, searchTerm, options = {}) {
    try {
      const {
        page = 1,
        limit = 50
      } = options;

      const skip = (page - 1) * limit;

      const comentarios = await Comentario.find({
        memorial: memorialId,
        estado: 'activo',
        $or: [
          { nombre: { $regex: searchTerm, $options: 'i' } },
          { mensaje: { $regex: searchTerm, $options: 'i' } },
          { relacion: { $regex: searchTerm, $options: 'i' } }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

      return comentarios.map(comentario => ({
        id: comentario._id,
        nombre: comentario.nombre,
        mensaje: comentario.mensaje,
        relacion: comentario.relacion,
        fechaCreacion: comentario.createdAt,
        fechaRelativa: this.getFechaRelativa(comentario.createdAt)
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ComentarioRepository();