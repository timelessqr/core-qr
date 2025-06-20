// ====================================
// src/modules/dashboard/services/dashboardService.js
// ====================================
const dashboardRepository = require('../repositories/dashboardRepository');
const Dashboard = require('../../../models/Dashboard');
const Profile = require('../../../models/Profile');
const User = require('../../../models/User');
const { SECCIONES_DISPONIBLES, DASHBOARD_THEMES, PLANS } = require('../../../utils/constants');

class DashboardService {
  /**
   * Crear dashboard por defecto para un perfil
   */
  async createDefault(profileId, userId) {
    try {
      // Verificar que el perfil existe (modelo B2B)
      const profile = await Profile.findById(profileId);
      if (!profile) {
        throw new Error('Perfil no encontrado');
      }

      // Verificar si ya existe un dashboard
      const exists = await dashboardRepository.exists(profileId);
      if (exists) {
        throw new Error('Ya existe un dashboard para este perfil');
      }

      // Crear configuración por defecto
      const defaultConfig = Dashboard.crearConfiguracionPorDefecto(profileId);
      
      const dashboard = await dashboardRepository.create(defaultConfig);

      return {
        id: dashboard._id,
        profileId,
        message: 'Dashboard creado exitosamente',
        data: dashboard
      };

    } catch (error) {
      throw new Error(`Error creando dashboard: ${error.message}`);
    }
  }

  /**
   * Obtener dashboard de un perfil
   */
  async getByProfile(profileId, userId) {
    try {
      // Verificar que el perfil existe (modelo B2B)
      const profile = await Profile.findById(profileId);
      if (!profile) {
        throw new Error('Perfil no encontrado');
      }

      let dashboard = await dashboardRepository.findByProfile(profileId);

      // Si no existe dashboard, crear uno por defecto
      if (!dashboard) {
        const defaultResult = await this.createDefault(profileId, userId);
        dashboard = defaultResult.data;
      }

      return {
        profileId,
        profileName: profile.nombre,
        dashboard: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error obteniendo dashboard: ${error.message}`);
    }
  }

  /**
   * Obtener configuración pública para memorial
   */
  async getPublicConfig(profileId) {
    try {
      const config = await dashboardRepository.getPublicConfig(profileId);
      
      if (!config) {
        throw new Error('Configuración de memorial no encontrada');
      }

      // Verificar si es público
      const dashboard = await dashboardRepository.findByProfile(profileId);
      if (!dashboard.privacidad.publico) {
        throw new Error('Este memorial es privado');
      }

      return this.formatPublicConfig(config);
    } catch (error) {
      throw new Error(`Error obteniendo configuración pública: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración general
   */
  async updateConfig(profileId, userId, configUpdates) {
    try {
      // Verificar autorización
      await this.verifyUserAccess(profileId, userId);

      // Validar configuración
      const validatedConfig = this.validateConfig(configUpdates);

      const dashboard = await dashboardRepository.update(profileId, {
        configuracion: validatedConfig
      });

      if (!dashboard) {
        throw new Error('Dashboard no encontrado');
      }

      return {
        message: 'Configuración actualizada exitosamente',
        data: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error actualizando configuración: ${error.message}`);
    }
  }

  /**
   * Actualizar secciones
   */
  async updateSections(profileId, userId, sectionsData) {
    try {
      // Verificar autorización
      const user = await this.verifyUserAccess(profileId, userId);

      // Validar límites del plan
      const activeSections = sectionsData.filter(s => s.activa).length;
      const userPlan = PLANS[user.plan.toUpperCase()];
      
      if (activeSections > userPlan.limits.secciones) {
        throw new Error(`Su plan permite máximo ${userPlan.limits.secciones} secciones activas`);
      }

      // Validar secciones
      const validatedSections = this.validateSections(sectionsData);

      const dashboard = await dashboardRepository.update(profileId, {
        secciones: validatedSections
      });

      return {
        message: 'Secciones actualizadas exitosamente',
        data: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error actualizando secciones: ${error.message}`);
    }
  }

  /**
   * Reordenar secciones
   */
  async reorderSections(profileId, userId, sectionsOrder) {
    try {
      // Verificar autorización
      await this.verifyUserAccess(profileId, userId);

      const dashboard = await dashboardRepository.reorderSections(profileId, sectionsOrder);

      return {
        message: 'Orden de secciones actualizado exitosamente',
        data: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error reordenando secciones: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración de privacidad
   */
  async updatePrivacy(profileId, userId, privacyConfig) {
    try {
      // Verificar autorización
      await this.verifyUserAccess(profileId, userId);

      // Validar configuración de privacidad
      const validatedPrivacy = this.validatePrivacyConfig(privacyConfig);

      const dashboard = await dashboardRepository.updatePrivacyConfig(profileId, validatedPrivacy);

      return {
        message: 'Configuración de privacidad actualizada exitosamente',
        data: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error actualizando privacidad: ${error.message}`);
    }
  }

  /**
   * Actualizar configuración SEO
   */
  async updateSEO(profileId, userId, seoConfig) {
    try {
      // Verificar autorización
      await this.verifyUserAccess(profileId, userId);

      // Validar configuración SEO
      const validatedSEO = this.validateSEOConfig(seoConfig);

      const dashboard = await dashboardRepository.updateSEOConfig(profileId, validatedSEO);

      return {
        message: 'Configuración SEO actualizada exitosamente',
        data: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error actualizando SEO: ${error.message}`);
    }
  }

  /**
   * Cambiar tema
   */
  async changeTheme(profileId, userId, themeData) {
    try {
      // Verificar autorización
      await this.verifyUserAccess(profileId, userId);

      const { tema, configuracion } = themeData;

      // Validar tema
      if (!Object.values(DASHBOARD_THEMES).includes(tema)) {
        throw new Error('Tema no válido');
      }

      // Obtener configuración actual y actualizarla
      const dashboard = await dashboardRepository.findByProfile(profileId);
      const updatedConfig = {
        ...dashboard.configuracion,
        tema,
        ...configuracion
      };

      const updatedDashboard = await dashboardRepository.updateThemeConfig(profileId, updatedConfig);

      return {
        message: 'Tema actualizado exitosamente',
        data: this.formatDashboard(updatedDashboard)
      };

    } catch (error) {
      throw new Error(`Error cambiando tema: ${error.message}`);
    }
  }

  /**
   * Obtener templates disponibles
   */
  async getTemplates() {
    try {
      return {
        temas: Object.values(DASHBOARD_THEMES).map(tema => ({
          id: tema,
          nombre: this.formatThemeName(tema),
          descripcion: this.getThemeDescription(tema),
          preview: `/assets/themes/${tema}-preview.jpg`
        })),
        secciones: SECCIONES_DISPONIBLES.map(seccion => ({
          id: seccion,
          nombre: this.formatSectionName(seccion),
          descripcion: this.getSectionDescription(seccion),
          icono: this.getSectionIcon(seccion),
          configuraciones: this.getSectionConfigurations(seccion)
        }))
      };
    } catch (error) {
      throw new Error(`Error obteniendo templates: ${error.message}`);
    }
  }

  /**
   * Duplicar configuración de otro perfil
   */
  async duplicateConfig(sourceProfileId, targetProfileId, userId) {
    try {
      // Verificar autorización para ambos perfiles
      await this.verifyUserAccess(sourceProfileId, userId);
      await this.verifyUserAccess(targetProfileId, userId);

      const sourceDashboard = await dashboardRepository.findByProfile(sourceProfileId);
      if (!sourceDashboard) {
        throw new Error('Dashboard fuente no encontrado');
      }

      // Crear nueva configuración basada en la fuente
      const newConfig = {
        perfil: targetProfileId,
        secciones: sourceDashboard.secciones,
        configuracion: sourceDashboard.configuracion,
        privacidad: {
          ...sourceDashboard.privacidad,
          requierePassword: false,
          password: undefined
        }
      };

      const dashboard = await dashboardRepository.update(targetProfileId, newConfig);

      return {
        message: 'Configuración duplicada exitosamente',
        data: this.formatDashboard(dashboard)
      };

    } catch (error) {
      throw new Error(`Error duplicando configuración: ${error.message}`);
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  /**
   * Verificar acceso del usuario al perfil - MODELO B2B
   * En el modelo B2B, el admin puede gestionar todos los perfiles
   */
  async verifyUserAccess(profileId, userId) {
    // En modelo B2B, verificar que existe el perfil (admin gestiona todos)
    const profile = await Profile.findById(profileId);
    if (!profile) {
      throw new Error('Perfil no encontrado');
    }

    // Verificar que el usuario es admin
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // En modelo B2B, todos los usuarios son admins
    return user;
  }

  /**
   * Validar configuración general
   */
  validateConfig(config) {
    const allowedFields = [
      'tema', 'colorPrimario', 'colorSecundario', 'colorAccento',
      'fuente', 'tamanoFuente', 'permitirCondolencias', 'mostrarEstadisticas',
      'mostrarFechas', 'reproduccionAutomatica', 'efectosAnimacion'
    ];

    const validated = {};
    
    allowedFields.forEach(field => {
      if (config[field] !== undefined) {
        validated[field] = config[field];
      }
    });

    // Validaciones específicas
    if (validated.tema && !Object.values(DASHBOARD_THEMES).includes(validated.tema)) {
      throw new Error('Tema no válido');
    }

    // Validar colores hex
    const colorFields = ['colorPrimario', 'colorSecundario', 'colorAccento'];
    colorFields.forEach(field => {
      if (validated[field] && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(validated[field])) {
        throw new Error(`${field} debe ser un color hexadecimal válido`);
      }
    });

    return validated;
  }

  /**
   * Validar secciones
   */
  validateSections(sections) {
    return sections.map((section, index) => {
      // Validar tipo de sección
      if (!SECCIONES_DISPONIBLES.includes(section.tipo)) {
        throw new Error(`Tipo de sección no válido: ${section.tipo}`);
      }

      return {
        tipo: section.tipo,
        activa: Boolean(section.activa),
        orden: section.orden !== undefined ? parseInt(section.orden) : index,
        configuracion: section.configuracion || {},
        contenido: {
          titulo: section.contenido?.titulo || this.formatSectionName(section.tipo),
          descripcion: section.contenido?.descripcion || '',
          icono: section.contenido?.icono || this.getSectionIcon(section.tipo)
        }
      };
    });
  }

  /**
   * Validar configuración de privacidad
   */
  validatePrivacyConfig(privacy) {
    const validated = {
      publico: Boolean(privacy.publico),
      requierePassword: Boolean(privacy.requierePassword),
      mensajeBienvenida: privacy.mensajeBienvenida || ''
    };

    if (validated.requierePassword && privacy.password) {
      validated.password = privacy.password;
    }

    return validated;
  }

  /**
   * Validar configuración SEO
   */
  validateSEOConfig(seo) {
    return {
      titulo: seo.titulo?.substring(0, 60) || '',
      descripcion: seo.descripcion?.substring(0, 160) || '',
      palabrasClave: Array.isArray(seo.palabrasClave) ? 
        seo.palabrasClave.map(p => p.substring(0, 50)).slice(0, 10) : []
    };
  }

  /**
   * Formatear dashboard para respuesta
   */
  formatDashboard(dashboard) {
    return {
      id: dashboard._id,
      perfil: dashboard.perfil,
      secciones: dashboard.secciones,
      configuracion: dashboard.configuracion,
      privacidad: dashboard.privacidad,
      seo: dashboard.seo,
      updatedAt: dashboard.updatedAt
    };
  }

  /**
   * Formatear configuración pública
   */
  formatPublicConfig(config) {
    return {
      perfil: config.perfil,
      secciones: config.secciones.sort((a, b) => a.orden - b.orden),
      configuracion: config.configuracion,
      seo: config.seo,
      css: this.generateCustomCSS(config.configuracion)
    };
  }

  /**
   * Generar CSS personalizado
   */
  generateCustomCSS(config) {
    return `
      :root {
        --color-primary: ${config.colorPrimario};
        --color-secondary: ${config.colorSecundario};
        --color-accent: ${config.colorAccento};
        --font-family: ${this.getFontFamily(config.fuente)};
        --font-size-base: ${this.getFontSize(config.tamanoFuente)};
      }
      
      .theme-${config.tema} {
        font-family: var(--font-family);
        font-size: var(--font-size-base);
        color: var(--color-primary);
      }
    `;
  }

  /**
   * Obtener familia de fuente
   */
  getFontFamily(fuente) {
    const fonts = {
      'serif': 'Georgia, serif',
      'sans-serif': 'Arial, sans-serif',
      'monospace': 'Courier New, monospace',
      'cursive': 'Cursive, fantasy'
    };
    return fonts[fuente] || fonts['sans-serif'];
  }

  /**
   * Obtener tamaño de fuente
   */
  getFontSize(tamano) {
    const sizes = {
      'pequeño': '14px',
      'mediano': '16px',
      'grande': '18px'
    };
    return sizes[tamano] || sizes['mediano'];
  }

  /**
   * Formatear nombre de tema
   */
  formatThemeName(tema) {
    const names = {
      'clasico': 'Clásico',
      'moderno': 'Moderno',
      'elegante': 'Elegante'
    };
    return names[tema] || tema;
  }

  /**
   * Obtener descripción de tema
   */
  getThemeDescription(tema) {
    const descriptions = {
      'clasico': 'Diseño tradicional y elegante',
      'moderno': 'Estilo contemporáneo y minimalista',
      'elegante': 'Sofisticado y refinado'
    };
    return descriptions[tema] || '';
  }

  /**
   * Formatear nombre de sección
   */
  formatSectionName(seccion) {
    const names = {
      'biografia': 'Biografía',
      'galeria_fotos': 'Galería de Fotos',
      'videos_memoriales': 'Videos Memoriales',
      'cronologia': 'Cronología',
      'testimonios': 'Testimonios',
      'logros': 'Logros y Reconocimientos',
      'hobbies': 'Hobbies e Intereses',
      'frases_celebres': 'Frases Célebres',
      'datos_curiosos': 'Datos Curiosos',
      'condolencias': 'Condolencias'
    };
    return names[seccion] || seccion;
  }

  /**
   * Obtener descripción de sección
   */
  getSectionDescription(seccion) {
    const descriptions = {
      'biografia': 'Historia de vida y momentos especiales',
      'galeria_fotos': 'Recuerdos en imágenes',
      'videos_memoriales': 'Momentos en movimiento',
      'cronologia': 'Línea de tiempo de vida',
      'testimonios': 'Palabras de familiares y amigos',
      'logros': 'Reconocimientos y achievements',
      'hobbies': 'Pasatiempos e intereses',
      'frases_celebres': 'Citas y pensamientos',
      'datos_curiosos': 'Anécdotas interesantes',
      'condolencias': 'Mensajes de despedida'
    };
    return descriptions[seccion] || '';
  }

  /**
   * Obtener icono de sección
   */
  getSectionIcon(seccion) {
    const icons = {
      'biografia': 'user',
      'galeria_fotos': 'image',
      'videos_memoriales': 'video',
      'cronologia': 'clock',
      'testimonios': 'quote',
      'logros': 'award',
      'hobbies': 'heart',
      'frases_celebres': 'message-circle',
      'datos_curiosos': 'star',
      'condolencias': 'heart'
    };
    return icons[seccion] || 'square';
  }

  /**
   * Obtener configuraciones de sección
   */
  getSectionConfigurations(seccion) {
    const configs = {
      'galeria_fotos': ['grid', 'carousel', 'masonry'],
      'videos_memoriales': ['grid', 'list'],
      'cronologia': ['timeline', 'list'],
      'testimonios': ['carousel', 'list'],
      'condolencias': ['list', 'grid']
    };
    return configs[seccion] || ['list'];
  }
}

module.exports = new DashboardService();