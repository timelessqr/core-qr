// ====================================
// src/modules/clients/services/clientService.js
// ====================================
const clientRepository = require('../repositories/clientRepository');
const { validateClientData } = require('../../../utils/validators');

class ClientService {
  /**
   * Registrar nuevo cliente
   */
  async registerClient(clientData) {
    try {
      // Validar datos de entrada
      const { error, value } = validateClientData(clientData);
      if (error) {
        throw new Error(error.details[0].message);
      }

      // Verificar duplicados
      await this.checkDuplicates(value);

      // Crear cliente
      const client = await clientRepository.create(value);

      return {
        client: {
          id: client._id,
          codigoCliente: client.codigoCliente,
          nombre: client.nombre,
          apellido: client.apellido,
          telefono: client.telefono,
          email: client.email,
          fechaRegistro: client.fechaRegistro
        },
        message: `Cliente ${client.codigoCliente} registrado exitosamente`
      };

    } catch (error) {
      throw new Error(`Error registrando cliente: ${error.message}`);
    }
  }

  /**
   * Obtener cliente por ID
   */
  async getClientById(clientId) {
    try {
      const client = await clientRepository.findById(clientId);
      return client;
    } catch (error) {
      throw new Error(`Error obteniendo cliente: ${error.message}`);
    }
  }

  /**
   * Obtener cliente por código
   */
  async getClientByCode(codigoCliente) {
    try {
      const client = await clientRepository.findByCode(codigoCliente);
      return client;
    } catch (error) {
      throw new Error(`Error obteniendo cliente: ${error.message}`);
    }
  }

  /**
   * Listar clientes con paginación y filtros
   */
  async getClients(options = {}) {
    try {
      const result = await clientRepository.findAll(options);
      
      // Formatear datos para el frontend
      const clientsFormatted = result.clients.map(client => ({
        id: client._id,
        codigoCliente: client.codigoCliente,
        nombre: `${client.nombre} ${client.apellido}`,
        telefono: client.telefono,
        email: client.email || 'No registrado',
        fechaRegistro: client.fechaRegistro,
        ultimaActualizacion: client.ultimaActualizacion
      }));

      return {
        clients: clientsFormatted,
        pagination: result.pagination
      };

    } catch (error) {
      throw new Error(`Error obteniendo clientes: ${error.message}`);
    }
  }

  /**
   * Actualizar cliente
   */
  async updateClient(clientId, updateData) {
    try {
      // Validar datos
      const { error, value } = validateClientData(updateData, false);
      if (error) {
        throw new Error(error.details[0].message);
      }

      // Verificar duplicados (excluyendo el cliente actual)
      await this.checkDuplicates(value, clientId);

      // Actualizar
      const client = await clientRepository.update(clientId, value);

      return {
        client: {
          id: client._id,
          codigoCliente: client.codigoCliente,
          nombre: client.nombre,
          apellido: client.apellido,
          telefono: client.telefono,
          email: client.email,
          direccion: client.direccion,
          observaciones: client.observaciones,
          ultimaActualizacion: client.ultimaActualizacion
        },
        message: 'Cliente actualizado exitosamente'
      };

    } catch (error) {
      throw new Error(`Error actualizando cliente: ${error.message}`);
    }
  }

  /**
   * Eliminar cliente
   */
  async deleteClient(clientId) {
    try {
      // Verificar que existe
      await clientRepository.findById(clientId);

      // TODO: Verificar que no tenga memoriales activos
      // const hasActiveMemorials = await this.checkActiveMemorials(clientId);
      // if (hasActiveMemorials) {
      //   throw new Error('No se puede eliminar cliente con memoriales activos');
      // }

      const result = await clientRepository.delete(clientId);
      return result;

    } catch (error) {
      throw new Error(`Error eliminando cliente: ${error.message}`);
    }
  }

  /**
   * Buscar clientes
   */
  async searchClients(termino, limit = 10) {
    try {
      if (!termino || termino.trim().length < 2) {
        throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
      }

      const clients = await clientRepository.search(termino.trim(), limit);
      
      return clients.map(client => ({
        id: client._id,
        codigoCliente: client.codigoCliente,
        nombre: `${client.nombre} ${client.apellido}`,
        telefono: client.telefono,
        email: client.email || 'No registrado'
      }));

    } catch (error) {
      throw new Error(`Error buscando clientes: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getClientStats() {
    try {
      const stats = await clientRepository.getStats();
      const recent = await clientRepository.getRecent(5);

      return {
        estadisticas: {
          totalClientes: stats.total || 0,
          clientesActivos: stats.activos || 0,
          registradosEsteMes: stats.registradosEsteMes || 0
        },
        clientesRecientes: recent.map(client => ({
          id: client._id,
          codigoCliente: client.codigoCliente,
          nombre: `${client.nombre} ${client.apellido}`,
          fechaRegistro: client.fechaRegistro
        }))
      };

    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Verificar duplicados
   */
  async checkDuplicates(clientData, excludeId = null) {
    const { telefono, email } = clientData;

    // Verificar teléfono duplicado
    if (telefono) {
      const phoneExists = await clientRepository.existsByPhone(telefono, excludeId);
      if (phoneExists) {
        throw new Error('Ya existe un cliente con ese número de teléfono');
      }
    }

    // Verificar email duplicado (si se proporciona)
    if (email) {
      const emailExists = await clientRepository.existsByEmail(email, excludeId);
      if (emailExists) {
        throw new Error('Ya existe un cliente con ese email');
      }
    }
  }

  /**
   * Obtener información básica del cliente
   */
  async getClientBasicInfo(clientId) {
    try {
      const client = await clientRepository.findById(clientId);
      return {
        id: client._id,
        codigoCliente: client.codigoCliente,
        nombre: client.nombreCompleto,
        telefono: client.telefono,
        email: client.email
      };
    } catch (error) {
      throw new Error(`Error obteniendo información del cliente: ${error.message}`);
    }
  }
}

module.exports = new ClientService();
