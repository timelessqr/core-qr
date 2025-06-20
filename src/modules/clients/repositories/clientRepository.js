// ====================================
// src/modules/clients/repositories/clientRepository.js
// ====================================
const Client = require('../../../models/Client');
const mongoose = require('mongoose');

class ClientRepository {
  /**
   * Crear nuevo cliente
   */
  async create(clientData) {
    try {
      const client = new Client(clientData);
      return await client.save();
    } catch (error) {
      if (error.code === 11000) {
        // Error de duplicado
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`Ya existe un cliente con ese ${field}`);
      }
      throw error;
    }
  }

  /**
   * Obtener cliente por ID
   */
  async findById(clientId) {
    if (!mongoose.isValidObjectId(clientId)) {
      throw new Error('ID de cliente inválido');
    }

    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    return client;
  }

  /**
   * Obtener cliente por código
   */
  async findByCode(codigoCliente) {
    const client = await Client.findOne({ 
      codigoCliente: codigoCliente.toUpperCase(),
      activo: true 
    });
    
    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    return client;
  }

  /**
   * Obtener todos los clientes activos
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'fechaRegistro',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    let query = { activo: true };

    // Filtro de búsqueda
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { nombre: regex },
        { apellido: regex },
        { codigoCliente: regex },
        { telefono: regex },
        { email: regex }
      ];
    }

    const [clients, total] = await Promise.all([
      Client.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Client.countDocuments(query)
    ]);

    return {
      clients,
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

  /**
   * Actualizar cliente
   */
  async update(clientId, updateData) {
    if (!mongoose.isValidObjectId(clientId)) {
      throw new Error('ID de cliente inválido');
    }

    // No permitir actualizar campos de sistema
    delete updateData.codigoCliente;
    delete updateData.fechaRegistro;
    delete updateData._id;

    const client = await Client.findByIdAndUpdate(
      clientId,
      { 
        ...updateData,
        ultimaActualizacion: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    return client;
  }

  /**
   * Eliminar cliente (soft delete)
   */
  async delete(clientId) {
    if (!mongoose.isValidObjectId(clientId)) {
      throw new Error('ID de cliente inválido');
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      { 
        activo: false,
        ultimaActualizacion: new Date()
      },
      { new: true }
    );

    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    return { success: true, message: 'Cliente eliminado exitosamente' };
  }

  /**
   * Buscar clientes
   */
  async search(termino, limit = 10) {
    return await Client.buscar(termino).limit(limit);
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getStats() {
    const stats = await Client.getEstadisticas();
    return stats[0] || { 
      total: 0, 
      activos: 0, 
      registradosEsteMes: 0 
    };
  }

  /**
   * Verificar si existe cliente por teléfono
   */
  async existsByPhone(telefono, excludeId = null) {
    const query = { telefono, activo: true };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const client = await Client.findOne(query);
    return !!client;
  }

  /**
   * Verificar si existe cliente por email
   */
  async existsByEmail(email, excludeId = null) {
    if (!email) return false;
    
    const query = { email: email.toLowerCase(), activo: true };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const client = await Client.findOne(query);
    return !!client;
  }

  /**
   * Obtener clientes recientes
   */
  async getRecent(limit = 5) {
    return await Client.find({ activo: true })
      .sort({ fechaRegistro: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new ClientRepository();
