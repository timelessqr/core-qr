// ====================================
// src/modules/admin/controllers/adminController.js
// ====================================
const adminService = require('../services/adminService');
const { responseHelper } = require('../../../utils/responseHelper');

class AdminController {
  /**
   * Dashboard principal del admin
   */
  async getDashboard(req, res) {
    try {
      const dashboard = await adminService.getDashboard();
      
      responseHelper.success(
        res, 
        dashboard, 
        'Dashboard obtenido exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      responseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Registrar cliente completo con memorial
   */
  async registerComplete(req, res) {
    try {
      const { cliente, memorial } = req.body;
      
      if (!cliente || !memorial) {
        return responseHelper.error(res, 'Datos de cliente y memorial son requeridos', 400);
      }

      const result = await adminService.registerClientWithMemorial(cliente, memorial);
      
      responseHelper.success(
        res, 
        result, 
        'Cliente y memorial registrados exitosamente', 
        201
      );
    } catch (error) {
      console.error('Error en registro completo:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Búsqueda global en el sistema
   */
  async globalSearch(req, res) {
    try {
      const { q: termino } = req.query;
      
      if (!termino) {
        return responseHelper.error(res, 'Término de búsqueda requerido', 400);
      }

      const results = await adminService.globalSearch(termino);
      
      responseHelper.success(
        res, 
        results, 
        'Búsqueda completada exitosamente'
      );
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Resumen completo de un cliente
   */
  async getClientSummary(req, res) {
    try {
      const { clientId } = req.params;
      
      const summary = await adminService.getClientSummary(clientId);
      
      responseHelper.success(
        res, 
        summary, 
        'Resumen del cliente obtenido exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo resumen del cliente:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Crear memorial rápido
   */
  async createQuickMemorial(req, res) {
    try {
      const { clientId } = req.params;
      const memorialData = req.body;
      
      const memorial = await adminService.createQuickMemorial(clientId, memorialData);
      
      responseHelper.success(
        res, 
        memorial, 
        'Memorial creado exitosamente', 
        201
      );
    } catch (error) {
      console.error('Error creando memorial rápido:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Métricas y estadísticas del sistema
   */
  async getMetrics(req, res) {
    try {
      const metrics = await adminService.getSystemMetrics();
      
      responseHelper.success(
        res, 
        metrics, 
        'Métricas del sistema obtenidas exitosamente'
      );
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      responseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Endpoint de salud para el panel admin
   */
  async health(req, res) {
    try {
      const status = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        admin: req.user?.nombre || 'Admin',
        environment: process.env.NODE_ENV || 'development',
        features: {
          clientes: true,
          memoriales: true,
          qr: true,
          media: true,
          dashboard: true
        }
      };

      responseHelper.success(res, status, 'Sistema funcionando correctamente');
    } catch (error) {
      responseHelper.error(res, 'Error en sistema', 500);
    }
  }

  /**
   * Obtener configuración del sistema
   */
  async getConfig(req, res) {
    try {
      const config = {
        limites: {
          clientesPorPagina: 20,
          memorialesPorPagina: 20,
          tamanoMaximoArchivo: process.env.MAX_FILE_SIZE_MB || 100,
          formatosPermitidos: ['jpg', 'jpeg', 'png', 'mp4', 'mov']
        },
        funcionalidades: {
          registroRapido: true,
          busquedaGlobal: true,
          estadisticas: true,
          exportacion: false // Futuro
        },
        version: '1.0.0'
      };

      responseHelper.success(res, config, 'Configuración obtenida');
    } catch (error) {
      responseHelper.error(res, 'Error obteniendo configuración', 500);
    }
  }
}

module.exports = new AdminController();
