// src/models/Profile.js
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
        // Comparar solo fechas, no horas
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
        // Comparar solo fechas, no horas (evita problemas de zona horaria)
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const fallecimientoDate = new Date(v.getFullYear(), v.getMonth(), v.getDate());
        
        // Verificar que no sea fecha futura
        if (fallecimientoDate > todayDate) {
          return false;
        }
        
        // Verificar que sea posterior al nacimiento (solo si fechaNacimiento existe)
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
    type: String, // URL o path de la imagen
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
  
  // Datos biográficos
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
  
  // Referencia al QR (módulo independiente)
  qr: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QR'
  },
  
  // Referencias
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es requerido']
  },
  
  // Sistema de comentarios
  codigoComentarios: {
    type: String,
    trim: true,
    maxlength: [50, 'El código no puede exceder 50 caracteres'],
    default: ''
  },
  comentariosHabilitados: {
    type: Boolean,
    default: true
  },
  fechaLimiteComentarios: {
    type: Date,
    default: null // null = sin límite
  },
  
  // Estado
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
profileSchema.index({ cliente: 1, isActive: 1 });
profileSchema.index({ qr: 1 });
profileSchema.index({ 'fechaNacimiento': 1, 'fechaFallecimiento': 1 });

// Método para validar código de comentarios
profileSchema.methods.validarCodigoComentarios = function(codigo) {
  if (!this.comentariosHabilitados) {
    return { valido: false, mensaje: 'Los comentarios están deshabilitados' };
  }
  
  if (this.fechaLimiteComentarios && new Date() > this.fechaLimiteComentarios) {
    return { valido: false, mensaje: 'El período para comentar ha expirado' };
  }
  
  if (!this.codigoComentarios) {
    return { valido: false, mensaje: 'No hay código de comentarios configurado' };
  }
  
  if (this.codigoComentarios.toLowerCase() !== codigo.toLowerCase()) {
    return { valido: false, mensaje: 'Código incorrecto' };
  }
  
  return { valido: true, mensaje: 'Código válido' };
};

// Método para generar código automático
profileSchema.methods.generarCodigoComentarios = function() {
  const nombre = this.nombre.split(' ')[0].toUpperCase();
  const year = this.fechaFallecimiento.getFullYear();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${nombre}-${year}-${random}`;
};


profileSchema.virtual('edadAlFallecer').get(function() {
  if (this.fechaNacimiento && this.fechaFallecimiento) {
    const diffTime = Math.abs(this.fechaFallecimiento - this.fechaNacimiento);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
  }
  return null;
});

// Incluir virtuals en JSON
profileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Profile', profileSchema);