// ====================================
// src/modules/media/repositories/mediaRepository.js
// ====================================
const Media = require('../../../models/Media');

class MediaRepository {
  /**
   * Crear nuevo media
   */
  async create(mediaData) {
    try {
      const media = new Media(mediaData);
      return await media.save();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener media por ID
   */
  async findById(mediaId) {
    try {
      return await Media.findById(mediaId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los media de un memorial
   */
  async findByMemorial(memorialId, options = {}) {
    try {
      const {
        tipo = null,
        activo = true,
        page = 1,
        limit = 50,
        sortBy = 'orden',
        sortOrder = 'asc'
      } = options;

      const filtro = { 
        memorial: memorialId,
        estaActivo: activo
      };
      
      if (tipo) {
        filtro.tipo = tipo;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // Si ordena por orden, secundario por fecha de creación
      if (sortBy === 'orden') {
        sort.createdAt = 1;
      }

      const skip = (page - 1) * limit;

      const media = await Media.find(filtro)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Media.countDocuments(filtro);

      return {
        media,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener media público de un memorial (para visitantes)
   */
  async getPublicMedia(memorialId, tipo = null, seccion = null) {
    try {
      const filtro = { 
        memorial: memorialId,
        estaActivo: true
      };
      
      if (tipo) {
        filtro.tipo = tipo;
      }
      
      if (seccion) {
        filtro.seccion = seccion;
      }

      const media = await Media.find(filtro)
        .sort({ orden: 1, createdAt: 1 })
        .lean();

      return media.map(item => ({
        id: item._id,
        tipo: item.tipo,
        seccion: item.seccion,
        titulo: item.titulo,
        descripcion: item.descripcion,
        url: item.archivo.url,
        urlThumbnail: item.procesado?.versiones?.thumbnail || item.archivo.url,
        urlMedium: item.procesado?.versiones?.medium || item.archivo.url,
        dimensiones: item.dimensiones,
        orden: item.orden,
        esPortada: item.esPortada,
        fechaSubida: item.createdAt,
        fechaOriginal: item.metadata?.fechaOriginal,
        // Campos específicos para YouTube
        videoId: item.metadata?.videoId,
        thumbnail: item.metadata?.thumbnail,
        embedUrl: item.metadata?.embedUrl
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar media
   */
  async update(mediaId, updates) {
    try {
      const allowedUpdates = [
        'titulo', 'descripcion', 'orden', 'esPortada', 'estaActivo',
        'metadata', 'procesado'
      ];
      
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      return await Media.findByIdAndUpdate(
        mediaId,
        filteredUpdates,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar media (soft delete)
   */
  async delete(mediaId) {
    try {
      return await Media.findByIdAndUpdate(
        mediaId,
        { estaActivo: false },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar media permanentemente
   */
  async hardDelete(mediaId) {
    try {
      return await Media.findByIdAndDelete(mediaId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reordenar media
   */
  async reorderMedia(memorialId, newOrder) {
    try {
      const updatePromises = newOrder.map((item, index) => 
        Media.findByIdAndUpdate(
          item.id,
          { orden: index },
          { new: true }
        )
      );

      return await Promise.all(updatePromises);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Establecer portada
   */
  async setPortada(mediaId, memorialId, tipo) {
    try {
      // Remover portada actual
      await Media.updateMany(
        { 
          memorial: memorialId,
          tipo,
          _id: { $ne: mediaId }
        },
        { esPortada: false }
      );

      // Establecer nueva portada
      return await Media.findByIdAndUpdate(
        mediaId,
        { esPortada: true },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener portada de un memorial
   */
  async getPortada(memorialId, tipo = 'foto') {
    try {
      return await Media.findOne({
        memorial: memorialId,
        tipo,
        esPortada: true,
        estaActivo: true
      }).lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Contar media por memorial y tipo
   */
  async countByMemorial(memorialId, tipo = null) {
    try {
      const filtro = { 
        memorial: memorialId,
        estaActivo: true
      };
      
      if (tipo) {
        filtro.tipo = tipo;
      }
      
      return await Media.countDocuments(filtro);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas de media
   */
  async getStats(memorialId) {
    try {
      const stats = await Media.aggregate([
        {
          $match: {
            memorial: memorialId,
            estaActivo: true
          }
        },
        {
          $group: {
            _id: '$tipo',
            count: { $sum: 1 },
            totalSize: { $sum: '$archivo.tamaño' },
            totalVistas: { $sum: '$estadisticas.vistas' }
          }
        }
      ]);

      const result = {
        total: 0,
        fotos: 0,
        videos: 0,
        tamañoTotal: 0,
        vistasTotal: 0
      };

      stats.forEach(stat => {
        result.total += stat.count;
        result.tamañoTotal += stat.totalSize;
        result.vistasTotal += stat.totalVistas;
        
        if (stat._id === 'foto') {
          result.fotos = stat.count;
        } else if (stat._id === 'video') {
          result.videos = stat.count;
        }
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar media por texto
   */
  async search(memorialId, searchTerm, options = {}) {
    try {
      const {
        tipo = null,
        page = 1,
        limit = 50
      } = options;

      const filtro = {
        memorial: memorialId,
        estaActivo: true,
        $or: [
          { titulo: { $regex: searchTerm, $options: 'i' } },
          { descripcion: { $regex: searchTerm, $options: 'i' } },
          { 'archivo.nombreOriginal': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (tipo) {
        filtro.tipo = tipo;
      }

      const skip = (page - 1) * limit;

      const media = await Media.find(filtro)
        .sort({ orden: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Media.countDocuments(filtro);

      return {
        media,
        total,
        searchTerm,
        page,
        limit
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrementar vistas
   */
  async incrementViews(mediaId) {
    try {
      return await Media.findByIdAndUpdate(
        mediaId,
        { $inc: { 'estadisticas.vistas': 1 } },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener media reciente
   */
  async getRecent(memorialId, limit = 10) {
    try {
      return await Media.find({
        memorial: memorialId,
        estaActivo: true
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verificar si un memorial tiene media
   */
  async hasMedia(memorialId, tipo = null) {
    try {
      const filtro = { 
        memorial: memorialId,
        estaActivo: true
      };
      
      if (tipo) {
        filtro.tipo = tipo;
      }
      
      const count = await Media.countDocuments(filtro);
      return count > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener estadísticas por sección
   */
  async getSectionStats(memorialId) {
    try {
      const stats = await Media.aggregate([
        {
          $match: {
            memorial: memorialId,
            estaActivo: true
          }
        },
        {
          $group: {
            _id: {
              seccion: '$seccion',
              tipo: '$tipo'
            },
            count: { $sum: 1 },
            totalSize: { $sum: '$archivo.tamaño' },
            totalVistas: { $sum: '$estadisticas.vistas' }
          }
        }
      ]);

      const result = {
        galeria: { fotos: 0, videos: 0, total: 0, size: 0, views: 0 },
        fondos: { fotos: 0, videos: 0, total: 0, size: 0, views: 0 },
        musica: { youtube: 0, total: 0, size: 0, views: 0 }
      };

      stats.forEach(stat => {
        const seccion = stat._id.seccion;
        const tipo = stat._id.tipo;
        
        if (result[seccion]) {
          if (tipo === 'foto') {
            result[seccion].fotos = stat.count;
          } else if (tipo === 'video') {
            result[seccion].videos = stat.count;
          } else if (tipo === 'youtube') {
            result[seccion].youtube = stat.count;
          }
          
          result[seccion].total += stat.count;
          result[seccion].size += stat.totalSize;
          result[seccion].views += stat.totalVistas;
        }
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener media filtrado por sección
   */
  async findBySection(memorialId, seccion, options = {}) {
    try {
      const {
        tipo = null,
        activo = true,
        page = 1,
        limit = 50,
        sortBy = 'orden',
        sortOrder = 'asc'
      } = options;

      const filtro = { 
        memorial: memorialId,
        seccion: seccion,
        estaActivo: activo
      };
      
      if (tipo) {
        filtro.tipo = tipo;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      if (sortBy === 'orden') {
        sort.createdAt = 1;
      }

      const skip = (page - 1) * limit;

      const media = await Media.find(filtro)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Media.countDocuments(filtro);

      return {
        media,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MediaRepository();