// ====================================
// src/models/Dashboard.js
// ====================================
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
      type: mongoose.Schema.Types.Mixed, // Flexible para diferentes configuraciones
      default: {}
    },
    contenido: {
      type: mongoose.Schema.Types.Mixed, // Flexible para diferentes tipos de contenido
      default: {}
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
    permitirCondolencias: {
      type: Boolean,
      default: true
    },
    mostrarEstadisticas: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Índices
dashboardSchema.index({ perfil: 1 });

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

module.exports = mongoose.model('Dashboard', dashboardSchema);