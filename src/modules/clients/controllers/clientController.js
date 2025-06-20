// ====================================
// src/modules/clients/controllers/clientController.js
// ====================================
const clientService = require('../services/clientService');
const { responseHelper } = require('../../../utils/responseHelper');

class ClientController {
  /**
   * Registrar nuevo cliente
   */
  async register(req, res) {
    try {
      const clientData = req.body;
      const result = await clientService.registerClient(clientData);
      
      responseHelper.success(
        res, 
        result.client, 
        result.message, 
        201
      );
    } catch (error) {
      console.error('Error registrando cliente:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener todos los clientes
   */
  async getAll(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || '',
        sortBy: req.query.sortBy || 'fechaRegistro',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await clientService.getClients(options);
      
      responseHelper.success(
        res, 
        result, 
        'Clientes obtenidos exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener cliente por ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const client = await clientService.getClientById(id);
      
      responseHelper.success(
        res, 
        client, 
        'Cliente obtenido exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Obtener cliente por código
   */
  async getByCode(req, res) {
    try {
      const { codigo } = req.params;
      const client = await clientService.getClientByCode(codigo);
      
      responseHelper.success(
        res, 
        client, 
        'Cliente obtenido exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo cliente por código:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Actualizar cliente
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const result = await clientService.updateClient(id, updateData);
      
      responseHelper.success(
        res, 
        result.client, 
        result.message
      );
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Eliminar cliente
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await clientService.deleteClient(id);
      
      responseHelper.success(
        res, 
        result, 
        result.message
      );
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Buscar clientes
   */
  async search(req, res) {
    try {
      const { q: termino, limit } = req.query;
      
      if (!termino) {
        return responseHelper.error(res, 'Término de búsqueda requerido', 400);
      }

      const clients = await clientService.searchClients(termino, parseInt(limit) || 10);
      
      responseHelper.success(
        res, 
        clients, 
        'Búsqueda completada exitosamente'
      );
    } catch (error) {
      console.error('Error buscando clientes:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getStats(req, res) {
    try {
      const stats = await clientService.getClientStats();
      
      responseHelper.success(
        res, 
        stats, 
        'Estadísticas obtenidas exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener información básica del cliente
   */
  async getBasicInfo(req, res) {
    try {
      const { id } = req.params;
      const info = await clientService.getClientBasicInfo(id);
      
      responseHelper.success(
        res, 
        info, 
        'Información básica obtenida'
      );
    } catch (error) {
      console.error('Error obteniendo información básica:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
}

module.exports = new ClientController();
