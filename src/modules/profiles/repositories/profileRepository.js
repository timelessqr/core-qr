const Profile = require('../../../models/Profile');
const mongoose = require('mongoose');

class ProfileRepository {
  async create(profileData) {
    try {
      const profile = new Profile(profileData);
      return await profile.save();
    } catch (error) {
      throw error;
    }
  }
  
  async findById(id) {
    return await Profile.findById(id)
      .populate('cliente', 'nombre apellido codigoCliente telefono email')
      .populate('qr')
      .lean();
  }
  
  async findByClientId(clientId) {
    return await Profile.find({ 
      cliente: clientId,
      isActive: true 
    })
    .populate('qr', 'code url estadisticas')
    .sort({ createdAt: -1 })
    .lean();
  }
  
  async findAllWithClient(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    let query = { isActive: true };

    // Filtro de búsqueda
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { nombre: regex },
        { biografia: regex },
        { profesion: regex }
      ];
    }

    const [profiles, total] = await Promise.all([
      Profile.find(query)
        .populate('cliente', 'nombre apellido codigoCliente telefono')
        .populate('qr', 'code url estadisticas')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Profile.countDocuments(query)
    ]);

    return {
      profiles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
  
  async findByQRCode(qrId) {
    return await Profile.findOne({ 
      qr: qrId,
      isActive: true,
      isPublic: true
    })
    .populate('cliente', 'nombre apellido codigoCliente')
    .populate('qr')
    .lean();
  }
  
  async update(id, updates) {
    return await Profile.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('qr', 'code url')
    .populate('cliente', 'nombre apellido codigoCliente');
  }
  
  async delete(id) {
    return await Profile.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
  
  // 🗑️ NUEVO: Eliminación completa (hard delete)
  async hardDelete(id) {
    console.log('🗑️ Ejecutando hard delete de profile:', id);
    return await Profile.findByIdAndDelete(id);
  }
  
  async linkQR(profileId, qrId) {
    return await Profile.findByIdAndUpdate(
      profileId,
      { qr: qrId },
      { new: true }
    );
  }
  
  async getPublicProfile(id) {
    return await Profile.findOne({
      _id: id,
      isActive: true,
      isPublic: true
    })
    .populate('qr', 'code estadisticas')
    .select('-cliente') // No mostrar datos del cliente en vista pública
    .lean();
  }
  
  async getClientStats(clientId) {
    if (!mongoose.isValidObjectId(clientId)) {
      throw new Error('ID de cliente inválido');
    }

    const profiles = await Profile.find({ 
      cliente: clientId, 
      isActive: true 
    }).lean();
    
    return {
      totalPerfiles: profiles.length,
      perfilesPublicos: profiles.filter(p => p.isPublic).length,
      perfilesPrivados: profiles.filter(p => !p.isPublic).length
    };
  }

  /**
   * Obtener perfil con información del cliente
   */
  async findByIdWithClient(profileId) {
    return await Profile.findById(profileId)
      .populate('cliente', 'nombre apellido codigoCliente telefono email direccion')
      .populate('qr', 'code url estadisticas')
      .lean();
  }

  /**
   * Buscar perfiles por términos
   */
  async search(searchTerm, limit = 10) {
    const regex = new RegExp(searchTerm, 'i');
    
    return await Profile.find({
      $or: [
        { nombre: regex },
        { biografia: regex },
        { profesion: regex }
      ],
      isActive: true
    })
    .populate('cliente', 'nombre apellido codigoCliente')
    .populate('qr', 'code url')
    .limit(limit)
    .lean();
  }

  /**
   * Obtener estadísticas generales
   */
  async getGeneralStats() {
    const stats = await Profile.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          publicos: {
            $sum: {
              $cond: [{ $eq: ['$isPublic', true] }, 1, 0]
            }
          },
          privados: {
            $sum: {
              $cond: [{ $eq: ['$isPublic', false] }, 1, 0]
            }
          },
          creadosEsteMes: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$createdAt',
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      publicos: 0,
      privados: 0,
      creadosEsteMes: 0
    };
  }
}

module.exports = new ProfileRepository();
