// src/models/Profile.js - CORRECCIÓN DE ÍNDICES
// ======================

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  // Datos básicos del fallecido
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  fechaNacimiento: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida'],
    validate: {
      validator: function(v) {
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const nacimientoDate = new Date(v.getFullYear(), v.getMonth(), v.getDate());
        return nacimientoDate < todayDate;
      },
      message: 'La fecha de nacimiento debe ser anterior a hoy'
    }
  },
  fechaFallecimiento: {
    type: Date,
    required: [true, 'La fecha de fallecimiento es requerida'],
    validate: {
      validator: function(v) {
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const fallecimientoDate = new Date(v.getFullYear(), v.getMonth(), v.getDate());
        
        if (fallecimientoDate > todayDate) {
          return false;
        }
        
        if (this.fechaNacimiento) {
          const nacimientoDate = new Date(this.fechaNacimiento.getFullYear(), this.fechaNacimiento.getMonth(), this.fechaNacimiento.getDate());
          return fallecimientoDate >= nacimientoDate;
        }
        
        return true;
      },
      message: 'La fecha de fallecimiento debe ser posterior al nacimiento y no futura'
    }
  },
  fotoPerfil: {
    type: String,
    default: null
  },
  frase: {
    type: String,
    maxlength: [200, 'La frase no puede exceder 200 caracteres'],
    default: '',
    trim: true
  },
  ubicacion: {
    ciudad: {
      type: String,
      trim: true,
      maxlength: [50, 'La ciudad no puede exceder 50 caracteres']
    },
    pais: {
      type: String,
      trim: true,
      maxlength: [50, 'El país no puede exceder 50 caracteres']
    },
    cementerio: {
      type: String,
      trim: true,
      maxlength: [100, 'El cementerio no puede exceder 100 caracteres']
    }
  },
  
  biografia: {
    type: String,
    maxlength: [10000, 'La biografía no puede exceder 10000 caracteres'],
    default: '',
    trim: true
  },
  profesion: {
    type: String,
    maxlength: [100, 'La profesión no puede exceder 100 caracteres'],
    trim: true
  },
  familia: {
    conyuge: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del cónyuge no puede exceder 100 caracteres']
    },
    hijos: [{
      type: String,
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    }],
    padres: [{
      type: String,
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    }],
    hermanos: [{
      type: String,
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    }]
  },
  
  qr: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QR'
  },
  
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es requerido']
  },
  
  codigoComentarios: {
    type: String,
    trim: true,
    maxlength: [50, 'El código no puede exceder 50 caracteres'],
    default: ''
  },
  codigoCliente: {
    type: String,
    trim: true,
    maxlength: [50, 'El código de cliente no puede exceder 50 caracteres'],
    default: ''
  },
  comentariosHabilitados: {
    type: Boolean,
    default: true
  },
  fechaLimiteComentarios: {
    type: Date,
    default: null
  },
  
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Configuración del memorial
  configuracion: {
    slideshow: {
      autoplay: {
        type: Boolean,
        default: true
      },
      interval: {
        type: Number,
        default: 5000,
        min: 1000,
        max: 30000
      },
      transition: {
        type: String,
        enum: ['fade', 'slide', 'zoom'],
        default: 'fade'
      }
    }
  }
}, {
  timestamps: true
});

// ✅ ÍNDICES CORREGIDOS - Sin duplicados
profileSchema.index({ cliente: 1, isActive: 1 }, { background: true });
profileSchema.index({ qr: 1 }, { unique: true, sparse: true, background: true });
profileSchema.index({ fechaNacimiento: 1, fechaFallecimiento: 1 }, { background: true });
profileSchema.index({ codigoComentarios: 1 }, { sparse: true, background: true });
profileSchema.index({ codigoCliente: 1 }, { sparse: true, background: true });

// Métodos del modelo
profileSchema.methods.validarCodigoComentarios = function(codigo) {
  if (!this.comentariosHabilitados) {
    return { valido: false, mensaje: 'Los comentarios están deshabilitados' };
  }
  
  if (this.fechaLimiteComentarios && new Date() > this.fechaLimiteComentarios) {
    return { valido: false, mensaje: 'El período para comentar ha expirado' };
  }
  
  if (this.codigoCliente && this.codigoCliente.toLowerCase() === codigo.toLowerCase()) {
    return { 
      valido: true, 
      mensaje: 'Código de cliente válido',
      nivel: 'cliente',
      permisos: ['comentar', 'responder']
    };
  }
  
  if (this.codigoComentarios && this.codigoComentarios.toLowerCase() === codigo.toLowerCase()) {
    return { 
      valido: true, 
      mensaje: 'Código familiar válido',
      nivel: 'familiar',
      permisos: ['comentar']
    };
  }
  
  return { valido: false, mensaje: 'Código incorrecto' };
};

profileSchema.methods.generarCodigoComentarios = function() {
  const nombre = this.nombre.split(' ')[0].toUpperCase();
  const year = this.fechaFallecimiento.getFullYear();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FAMILIA-${year}-${random}`;
};

profileSchema.methods.generarCodigoCliente = function() {
  const nombre = this.nombre.split(' ')[0].toUpperCase();
  const year = this.fechaFallecimiento.getFullYear();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CLIENTE-${year}-${random}`;
};

profileSchema.virtual('edadAlFallecer').get(function() {
  if (this.fechaNacimiento && this.fechaFallecimiento) {
    const diffTime = Math.abs(this.fechaFallecimiento - this.fechaNacimiento);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
  }
  return null;
});

profileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Profile', profileSchema);