// ====================================
// src/models/Dashboard.js
// ====================================
const mongoose = require('mongoose');
const { SECCIONES_DISPONIBLES, DASHBOARD_THEMES } = require('../utils/constants');

const dashboardSchema = new mongoose.Schema({
  perfil: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: [true, 'El perfil es requerido'],
    unique: true
  },
  secciones: [{
    tipo: {
      type: String,
      enum: SECCIONES_DISPONIBLES,
      required: [true, 'El tipo de sección es requerido']
    },
    activa: {
      type: Boolean,
      default: true
    },
    orden: {
      type: Number,
      default: 0,
      min: 0
    },
    configuracion: {
      tipo: {
        type: String,
        enum: ['grid', 'carousel', 'list', 'timeline'],
        default: 'grid'
      },
      columnas: {
        type: Number,
        default: 3,
        min: 1,
        max: 6
      },
      autoplay: {
        type: Boolean,
        default: false
      },
      mostrarTitulos: {
        type: Boolean,
        default: true
      },
      mostrarDescripciones: {
        type: Boolean,
        default: true
      }
    },
    contenido: {
      titulo: {
        type: String,
        trim: true,
        maxlength: [100, 'El título no puede exceder 100 caracteres']
      },
      descripcion: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
      },
      icono: {
        type: String,
        default: ''
      }
    }
  }],
  configuracion: {
    tema: {
      type: String,
      enum: Object.values(DASHBOARD_THEMES),
      default: DASHBOARD_THEMES.CLASICO
    },
    colorPrimario: {
      type: String,
      default: '#333333',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un hex válido']
    },
    colorSecundario: {
      type: String,
      default: '#ffffff',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un hex válido']
    },
    colorAccento: {
      type: String,
      default: '#007bff',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un hex válido']
    },
    fuente: {
      type: String,
      enum: ['serif', 'sans-serif', 'monospace', 'cursive'],
      default: 'sans-serif'
    },
    tamanoFuente: {
      type: String,
      enum: ['pequeño', 'mediano', 'grande'],
      default: 'mediano'
    },
    permitirCondolencias: {
      type: Boolean,
      default: true
    },
    mostrarEstadisticas: {
      type: Boolean,
      default: false
    },
    mostrarFechas: {
      type: Boolean,
      default: true
    },
    reproduccionAutomatica: {
      type: Boolean,
      default: false
    },
    efectosAnimacion: {
      type: Boolean,
      default: true
    }
  },
  privacidad: {
    publico: {
      type: Boolean,
      default: true
    },
    requierePassword: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      trim: true
    },
    mensajeBienvenida: {
      type: String,
      trim: true,
      maxlength: [1000, 'El mensaje de bienvenida no puede exceder 1000 caracteres']
    }
  },
  seo: {
    titulo: {
      type: String,
      trim: true,
      maxlength: [60, 'El título SEO no puede exceder 60 caracteres']
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [160, 'La descripción SEO no puede exceder 160 caracteres']
    },
    palabrasClave: [{
      type: String,
      trim: true,
      maxlength: [50, 'Palabra clave no puede exceder 50 caracteres']
    }]
  }
}, {
  timestamps: true
});

// Índices (perfil ya tiene índice único automático por unique: true)
dashboardSchema.index({ 'configuracion.tema': 1 }, { background: true });
dashboardSchema.index({ 'privacidad.publico': 1 }, { background: true });

// Método para obtener secciones activas ordenadas
dashboardSchema.methods.getSeccionesActivas = function() {
  return this.secciones
    .filter(seccion => seccion.activa)
    .sort((a, b) => a.orden - b.orden);
};

// Método para validar límites de secciones según plan
dashboardSchema.methods.validarLimitesSecciones = function(planUsuario) {
  const { PLANS } = require('../utils/constants');
  const limite = PLANS[planUsuario.toUpperCase()]?.limits?.secciones || PLANS.BASICO.limits.secciones;
  
  const seccionesActivas = this.secciones.filter(s => s.activa).length;
  return seccionesActivas <= limite;
};

// Método para obtener configuración CSS personalizada
dashboardSchema.methods.getCustomCSS = function() {
  const config = this.configuracion;
  
  return {
    ':root': {
      '--color-primary': config.colorPrimario,
      '--color-secondary': config.colorSecundario,
      '--color-accent': config.colorAccento,
      '--font-family': config.fuente === 'serif' ? 'Georgia, serif' : 
                      config.fuente === 'sans-serif' ? 'Arial, sans-serif' :
                      config.fuente === 'monospace' ? 'Courier New, monospace' :
                      'Cursive, fantasy',
      '--font-size-base': config.tamanoFuente === 'pequeño' ? '14px' :
                         config.tamanoFuente === 'grande' ? '18px' : '16px'
    }
  };
};

// Método para crear configuración por defecto
dashboardSchema.statics.crearConfiguracionPorDefecto = function(profileId) {
  return {
    perfil: profileId,
    secciones: [
      {
        tipo: 'biografia',
        activa: true,
        orden: 0,
        contenido: {
          titulo: 'Biografía',
          descripcion: 'Historia de vida y momentos especiales',
          icono: 'user'
        },
        configuracion: {
          tipo: 'list',
          mostrarTitulos: true,
          mostrarDescripciones: true
        }
      },
      {
        tipo: 'galeria_fotos',
        activa: true,
        orden: 1,
        contenido: {
          titulo: 'Galería de Fotos',
          descripcion: 'Recuerdos en imágenes',
          icono: 'image'
        },
        configuracion: {
          tipo: 'grid',
          columnas: 3,
          mostrarTitulos: true,
          mostrarDescripciones: false
        }
      },
      {
        tipo: 'videos_memoriales',
        activa: true,
        orden: 2,
        contenido: {
          titulo: 'Videos Memoriales',
          descripcion: 'Momentos en movimiento',
          icono: 'video'
        },
        configuracion: {
          tipo: 'grid',
          columnas: 2,
          autoplay: false,
          mostrarTitulos: true
        }
      },
      {
        tipo: 'cronologia',
        activa: false,
        orden: 3,
        contenido: {
          titulo: 'Cronología',
          descripcion: 'Línea de tiempo de vida',
          icono: 'clock'
        },
        configuracion: {
          tipo: 'timeline',
          mostrarFechas: true,
          mostrarDescripciones: true
        }
      },
      {
        tipo: 'condolencias',
        activa: true,
        orden: 4,
        contenido: {
          titulo: 'Condolencias',
          descripcion: 'Mensajes de familiares y amigos',
          icono: 'heart'
        },
        configuracion: {
          tipo: 'list',
          mostrarTitulos: false,
          mostrarDescripciones: true
        }
      }
    ],
    configuracion: {
      tema: 'clasico',
      colorPrimario: '#333333',
      colorSecundario: '#ffffff',
      colorAccento: '#007bff',
      fuente: 'sans-serif',
      tamanoFuente: 'mediano',
      permitirCondolencias: true,
      mostrarEstadisticas: false,
      mostrarFechas: true,
      reproduccionAutomatica: false,
      efectosAnimacion: true
    },
    privacidad: {
      publico: true,
      requierePassword: false,
      mensajeBienvenida: ''
    },
    seo: {
      titulo: '',
      descripcion: '',
      palabrasClave: []
    }
  };
};

module.exports = mongoose.model('Dashboard', dashboardSchema);