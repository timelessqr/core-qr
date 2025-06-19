// ====================================
// src/modules/media/repositories/mediaRepository.js
// ====================================
const Media = require('../../../models/Media');
const { SECCIONES_DISPONIBLES } = require('../../../utils/constants');

class MediaRepository {
  /**
   * Crear nuevo registro de media
   */
  async create(mediaData) {
    try {
      const media = new Media(mediaData);
      return await media.save();
    } catch (error) {
      throw new Error(`Error creando media: ${error.message}`);
    }
  }

  /**
   * Buscar media por ID
   */
  async findById(id) {
    try {
      return await Media.findById(id)
        .populate('perfil', 'nombre apellido')
        .populate('uploadedBy', 'nombre email');
    } catch (error) {
      throw new Error(`Error buscando media: ${error.message}`);
    }
  }

  /**
   * Buscar todos los media de un perfil
   */
  async findByProfile(profileId, filters = {}) {
    try {
      const query = { perfil: profileId };
      
      // Aplicar filtros
      if (filters.tipo) query.tipo = filters.tipo;
      if (filters.seccion) query.seccion = filters.seccion;
      if (filters.estado) query.estado = filters.estado;

      return await Media.find(query)
        .populate('uploadedBy', 'nombre email')
        .sort({ seccion: 1, orden: 1, createdAt: -1 });
    } catch (error) {
      throw new Error(`Error buscando media del perfil: ${error.message}`);
    }
  }

  /**
   * Buscar media por usuario
   */
  async findByUser(userId, filters = {}) {
    try {
      const query = { uploadedBy: userId };
      
      // Aplicar filtros
      if (filters.tipo) query.tipo = filters.tipo;
      if (filters.estado) query.estado = filters.estado;

      return await Media.find(query)
        .populate('perfil', 'nombre apellido')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Error buscando media del usuario: ${error.message}`);
    }
  }

  /**
   * Actualizar media
   */
  async update(id, updates) {
    try {
      return await Media.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error actualizando media: ${error.message}`);
    }
  }

  /**
   * Eliminar media
   */
  async delete(id) {
    try {
      return await Media.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Error eliminando media: ${error.message}`);
    }
  }

  /**
   * Contar media por perfil y tipo
   */
  async countByProfileAndType(profileId, tipo) {
    try {
      return await Media.countDocuments({ 
        perfil: profileId, 
        tipo,
        estado: 'completado'
      });
    } catch (error) {
      throw new Error(`Error contando media: ${error.message}`);
    }
  }

  /**
   * Calcular espacio utilizado por perfil
   */
  async getUsedStorageByProfile(profileId) {
    try {
      const result = await Media.aggregate([
        {
          $match: { 
            perfil: profileId,
            estado: 'completado'
          }
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$archivo.tamaño' }
          }
        }
      ]);

      return result.length > 0 ? result[0].totalSize : 0;
    } catch (error) {
      throw new Error(`Error calculando almacenamiento: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de media por perfil
   */
  async getMediaStats(profileId) {
    try {
      const stats = await Media.aggregate([
        {
          $match: { 
            perfil: profileId,
            estado: 'completado'
          }
        },
        {
          $group: {
            _id: '$tipo',
            count: { $sum: 1 },
            totalSize: { $sum: '$archivo.tamaño' }
          }
        }
      ]);

      // Formatear respuesta
      const result = {
        fotos: { count: 0, totalSize: 0 },
        videos: { count: 0, totalSize: 0 }
      };

      stats.forEach(stat => {
        if (stat._id === 'foto') {
          result.fotos = { count: stat.count, totalSize: stat.totalSize };
        } else if (stat._id === 'video') {
          result.videos = { count: stat.count, totalSize: stat.totalSize };
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Buscar media por sección para display público
   */
  async findBySection(profileId, seccion) {
    try {
      return await Media.find({
        perfil: profileId,
        seccion,
        estado: 'completado'
      }).sort({ orden: 1, createdAt: -1 });
    } catch (error) {
      throw new Error(`Error buscando media por sección: ${error.message}`);
    }
  }

  /**
   * Actualizar orden de media en una sección
   */
  async updateOrder(mediaIds, orders) {
    try {
      const bulkOps = mediaIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { orden: orders[index] }
        }
      }));

      return await Media.bulkWrite(bulkOps);
    } catch (error) {
      throw new Error(`Error actualizando orden: ${error.message}`);
    }
  }
}

module.exports = new MediaRepository();