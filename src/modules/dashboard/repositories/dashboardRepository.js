// ====================================
// src/modules/dashboard/repositories/dashboardRepository.js
// ====================================
const Dashboard = require('../../../models/Dashboard');

class DashboardRepository {
  /**
   * Crear configuración de dashboard
   */
  async create(dashboardData) {
    try {
      const dashboard = new Dashboard(dashboardData);
      return await dashboard.save();
    } catch (error) {
      throw new Error(`Error creando dashboard: ${error.message}`);
    }
  }

  /**
   * Buscar dashboard por perfil
   */
  async findByProfile(profileId) {
    try {
      return await Dashboard.findOne({ perfil: profileId })
        .populate('perfil', 'nombre apellido fechaNacimiento fechaFallecimiento');
    } catch (error) {
      throw new Error(`Error buscando dashboard: ${error.message}`);
    }
  }

  /**
   * Actualizar dashboard
   */
  async update(profileId, updates) {
    try {
      return await Dashboard.findOneAndUpdate(
        { perfil: profileId },
        { $set: updates },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error actualizando dashboard: ${error.message}`);
    }
  }

  /**
   * Actualizar sección específica
   */
  async updateSection(profileId, sectionIndex, sectionUpdates) {
    try {
      const updateQuery = {};
      
      // Construir query para actualizar sección específica
      Object.keys(sectionUpdates).forEach(key => {
        updateQuery[`secciones.${sectionIndex}.${key}`] = sectionUpdates[key];
      });

      return await Dashboard.findOneAndUpdate(
        { 
          perfil: profileId,
          [`secciones.${sectionIndex}`]: { $exists: true }
        },
        { $set: updateQuery },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error actualizando sección: ${error.message}`);
    }
  }

  /**
   * Agregar nueva sección
   */
  async addSection(profileId, sectionData) {
    try {
      return await Dashboard.findOneAndUpdate(
        { perfil: profileId },
        { $push: { secciones: sectionData } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error agregando sección: ${error.message}`);
    }
  }

  /**
   * Eliminar sección
   */
  async removeSection(profileId, sectionId) {
    try {
      return await Dashboard.findOneAndUpdate(
        { perfil: profileId },
        { $pull: { secciones: { _id: sectionId } } },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Error eliminando sección: ${error.message}`);
    }
  }

  /**
   * Reordenar secciones
   */
  async reorderSections(profileId, sectionsOrder) {
    try {
      const dashboard = await Dashboard.findOne({ perfil: profileId });
      if (!dashboard) {
        throw new Error('Dashboard no encontrado');
      }

      // Actualizar orden de cada sección
      sectionsOrder.forEach((sectionId, index) => {
        const sectionIndex = dashboard.secciones.findIndex(
          s => s._id.toString() === sectionId
        );
        if (sectionIndex !== -1) {
          dashboard.secciones[sectionIndex].orden = index;
        }
      });

      return await dashboard.save();
    } catch (error) {
      throw new Error(`Error reordenando secciones: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración de tema
   */
  async updateThemeConfig(profileId, themeConfig) {
    try {
      return await Dashboard.findOneAndUpdate(
        { perfil: profileId },
        { $set: { configuracion: themeConfig } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error actualizando configuración de tema: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración de privacidad
   */
  async updatePrivacyConfig(profileId, privacyConfig) {
    try {
      return await Dashboard.findOneAndUpdate(
        { perfil: profileId },
        { $set: { privacidad: privacyConfig } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error actualizando configuración de privacidad: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración SEO
   */
  async updateSEOConfig(profileId, seoConfig) {
    try {
      return await Dashboard.findOneAndUpdate(
        { perfil: profileId },
        { $set: { seo: seoConfig } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error actualizando configuración SEO: ${error.message}`);
    }
  }

  /**
   * Obtener configuración pública para memorial
   */
  async getPublicConfig(profileId) {
    try {
      const dashboard = await Dashboard.findOne({ perfil: profileId })
        .populate('perfil', 'nombre apellido fechaNacimiento fechaFallecimiento')
        .lean();

      if (!dashboard) {
        return null;
      }

      // Retornar solo información pública
      return {
        perfil: dashboard.perfil,
        secciones: dashboard.secciones.filter(s => s.activa),
        configuracion: {
          tema: dashboard.configuracion.tema,
          colorPrimario: dashboard.configuracion.colorPrimario,
          colorSecundario: dashboard.configuracion.colorSecundario,
          colorAccento: dashboard.configuracion.colorAccento,
          fuente: dashboard.configuracion.fuente,
          tamanoFuente: dashboard.configuracion.tamanoFuente,
          mostrarFechas: dashboard.configuracion.mostrarFechas,
          efectosAnimacion: dashboard.configuracion.efectosAnimacion,
          permitirCondolencias: dashboard.configuracion.permitirCondolencias
        },
        seo: dashboard.seo
      };
    } catch (error) {
      throw new Error(`Error obteniendo configuración pública: ${error.message}`);
    }
  }

  /**
   * Eliminar dashboard
   */
  async delete(profileId) {
    try {
      return await Dashboard.findOneAndDelete({ perfil: profileId });
    } catch (error) {
      throw new Error(`Error eliminando dashboard: ${error.message}`);
    }
  }
  
  // 🗑️ NUEVO: Alias para eliminar por profileId (usado en hard delete)
  async deleteByProfileId(profileId) {
    console.log('🗑️ Ejecutando eliminación de dashboard para profile:', profileId);
    return await this.delete(profileId);
  }

  /**
   * Verificar si dashboard existe
   */
  async exists(profileId) {
    try {
      const count = await Dashboard.countDocuments({ perfil: profileId });
      return count > 0;
    } catch (error) {
      throw new Error(`Error verificando dashboard: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de uso de dashboard
   */
  async getUsageStats() {
    try {
      const stats = await Dashboard.aggregate([
        {
          $group: {
            _id: '$configuracion.tema',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const totalDashboards = await Dashboard.countDocuments();
      const publicDashboards = await Dashboard.countDocuments({ 'privacidad.publico': true });
      const privateDashboards = await Dashboard.countDocuments({ 'privacidad.publico': false });

      return {
        total: totalDashboards,
        publicos: publicDashboards,
        privados: privateDashboards,
        temasMasUsados: stats,
        porcentajePublicos: totalDashboards > 0 ? (publicDashboards / totalDashboards * 100).toFixed(2) : 0
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Buscar dashboards por tema
   */
  async findByTheme(theme, limit = 10) {
    try {
      return await Dashboard.find({ 
        'configuracion.tema': theme,
        'privacidad.publico': true 
      })
      .populate('perfil', 'nombre apellido')
      .limit(limit)
      .sort({ updatedAt: -1 });
    } catch (error) {
      throw new Error(`Error buscando dashboards por tema: ${error.message}`);
    }
  }
}

module.exports = new DashboardRepository();