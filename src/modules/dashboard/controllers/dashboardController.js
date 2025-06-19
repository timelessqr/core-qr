// ====================================
// src/modules/dashboard/controllers/dashboardController.js
// ====================================
const dashboardService = require('../services/dashboardService');
const { responseHelper } = require('../../../utils/responseHelper');

class DashboardController {
  /**
   * Obtener dashboard de un perfil
   * GET /api/dashboard/:profileId
   */
  async getByProfile(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;

      const result = await dashboardService.getByProfile(profileId, userId);

      responseHelper.success(res, result, 'Dashboard obtenido exitosamente');

    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Crear dashboard por defecto
   * POST /api/dashboard/:profileId
   */
  async createDefault(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;

      const result = await dashboardService.createDefault(profileId, userId);

      responseHelper.success(res, result, 'Dashboard creado exitosamente', 201);

    } catch (error) {
      console.error('Error creando dashboard:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener configuración pública para memorial
   * GET /api/dashboard/public/:profileId
   */
  async getPublicConfig(req, res) {
    try {
      const { profileId } = req.params;

      const result = await dashboardService.getPublicConfig(profileId);

      responseHelper.success(res, result, 'Configuración pública obtenida');

    } catch (error) {
      console.error('Error obteniendo configuración pública:', error);
      responseHelper.error(res, error.message, 404);
    }
  }

  /**
   * Actualizar configuración general
   * PUT /api/dashboard/:profileId/config
   */
  async updateConfig(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const configUpdates = req.body;

      const result = await dashboardService.updateConfig(profileId, userId, configUpdates);

      responseHelper.success(res, result, 'Configuración actualizada exitosamente');

    } catch (error) {
      console.error('Error actualizando configuración:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Actualizar secciones
   * PUT /api/dashboard/:profileId/sections
   */
  async updateSections(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const sectionsData = req.body.secciones;

      if (!Array.isArray(sectionsData)) {
        return responseHelper.error(res, 'Las secciones deben ser un array', 400);
      }

      const result = await dashboardService.updateSections(profileId, userId, sectionsData);

      responseHelper.success(res, result, 'Secciones actualizadas exitosamente');

    } catch (error) {
      console.error('Error actualizando secciones:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Reordenar secciones
   * PUT /api/dashboard/:profileId/sections/reorder
   */
  async reorderSections(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const { sectionsOrder } = req.body;

      if (!Array.isArray(sectionsOrder)) {
        return responseHelper.error(res, 'El orden de secciones debe ser un array', 400);
      }

      const result = await dashboardService.reorderSections(profileId, userId, sectionsOrder);

      responseHelper.success(res, result, 'Orden actualizado exitosamente');

    } catch (error) {
      console.error('Error reordenando secciones:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Cambiar tema
   * PUT /api/dashboard/:profileId/theme
   */
  async changeTheme(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const themeData = req.body;

      if (!themeData.tema) {
        return responseHelper.error(res, 'El tema es requerido', 400);
      }

      const result = await dashboardService.changeTheme(profileId, userId, themeData);

      responseHelper.success(res, result, 'Tema actualizado exitosamente');

    } catch (error) {
      console.error('Error cambiando tema:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Actualizar configuración de privacidad
   * PUT /api/dashboard/:profileId/privacy
   */
  async updatePrivacy(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const privacyConfig = req.body;

      const result = await dashboardService.updatePrivacy(profileId, userId, privacyConfig);

      responseHelper.success(res, result, 'Configuración de privacidad actualizada');

    } catch (error) {
      console.error('Error actualizando privacidad:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Actualizar configuración SEO
   * PUT /api/dashboard/:profileId/seo
   */
  async updateSEO(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const seoConfig = req.body;

      const result = await dashboardService.updateSEO(profileId, userId, seoConfig);

      responseHelper.success(res, result, 'Configuración SEO actualizada exitosamente');

    } catch (error) {
      console.error('Error actualizando SEO:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Obtener templates disponibles
   * GET /api/dashboard/templates
   */
  async getTemplates(req, res) {
    try {
      const result = await dashboardService.getTemplates();

      responseHelper.success(res, result, 'Templates obtenidos exitosamente');

    } catch (error) {
      console.error('Error obteniendo templates:', error);
      responseHelper.error(res, error.message, 500);
    }
  }

  /**
   * Duplicar configuración de otro perfil
   * POST /api/dashboard/:profileId/duplicate/:sourceProfileId
   */
  async duplicateConfig(req, res) {
    try {
      const { profileId, sourceProfileId } = req.params;
      const userId = req.user.id;

      const result = await dashboardService.duplicateConfig(
        sourceProfileId, 
        profileId, 
        userId
      );

      responseHelper.success(res, result, 'Configuración duplicada exitosamente');

    } catch (error) {
      console.error('Error duplicando configuración:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Previsualizar configuración
   * POST /api/dashboard/:profileId/preview
   */
  async previewConfig(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const previewConfig = req.body;

      // Verificar acceso al perfil
      const dashboardService = require('../services/dashboardService');
      await dashboardService.verifyUserAccess(profileId, userId);

      // Generar configuración de preview (sin guardar)
      const preview = {
        configuracion: previewConfig.configuracion || {},
        secciones: previewConfig.secciones || [],
        css: dashboardService.generateCustomCSS(previewConfig.configuracion || {})
      };

      responseHelper.success(res, preview, 'Preview generado exitosamente');

    } catch (error) {
      console.error('Error generando preview:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Exportar configuración
   * GET /api/dashboard/:profileId/export
   */
  async exportConfig(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;

      const dashboard = await dashboardService.getByProfile(profileId, userId);

      // Preparar datos para exportación
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        dashboard: {
          secciones: dashboard.dashboard.secciones,
          configuracion: dashboard.dashboard.configuracion,
          seo: dashboard.dashboard.seo
        }
      };

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-config-${profileId}.json"`);
      
      res.json(exportData);

    } catch (error) {
      console.error('Error exportando configuración:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Importar configuración
   * POST /api/dashboard/:profileId/import
   */
  async importConfig(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const importData = req.body;

      if (!importData.dashboard) {
        return responseHelper.error(res, 'Datos de configuración inválidos', 400);
      }

      // Actualizar configuración importada
      const updates = {};
      
      if (importData.dashboard.secciones) {
        updates.secciones = importData.dashboard.secciones;
      }
      
      if (importData.dashboard.configuracion) {
        updates.configuracion = importData.dashboard.configuracion;
      }
      
      if (importData.dashboard.seo) {
        updates.seo = importData.dashboard.seo;
      }

      const result = await dashboardService.updateConfig(profileId, userId, updates);

      responseHelper.success(res, result, 'Configuración importada exitosamente');

    } catch (error) {
      console.error('Error importando configuración:', error);
      responseHelper.error(res, error.message, 400);
    }
  }

  /**
   * Restablecer configuración por defecto
   * POST /api/dashboard/:profileId/reset
   */
  async resetToDefault(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;

      // Verificar acceso
      const dashboardService = require('../services/dashboardService');
      await dashboardService.verifyUserAccess(profileId, userId);

      // Obtener configuración por defecto
      const Dashboard = require('../../../models/Dashboard');
      const defaultConfig = Dashboard.crearConfiguracionPorDefecto(profileId);

      // Actualizar con configuración por defecto
      const dashboardRepository = require('../repositories/dashboardRepository');
      const dashboard = await dashboardRepository.update(profileId, {
        secciones: defaultConfig.secciones,
        configuracion: defaultConfig.configuracion
      });

      const result = {
        message: 'Configuración restablecida a valores por defecto',
        data: dashboardService.formatDashboard(dashboard)
      };

      responseHelper.success(res, result, 'Configuración restablecida exitosamente');

    } catch (error) {
      console.error('Error restableciendo configuración:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
}

module.exports = new DashboardController();