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
        return v < new Date();
      },
      message: 'La fecha de nacimiento debe ser anterior a hoy'
    }
  },
  fechaFallecimiento: {
    type: Date,
    required: [true, 'La fecha de fallecimiento es requerida'],
    validate: {
      validator: function(v) {
        return v <= new Date() && v >= this.fechaNacimiento;
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
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
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
profileSchema.index({ usuario: 1, isActive: 1 });
profileSchema.index({ qr: 1 });
profileSchema.index({ 'fechaNacimiento': 1, 'fechaFallecimiento': 1 });

// Virtual para calcular edad al fallecer
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