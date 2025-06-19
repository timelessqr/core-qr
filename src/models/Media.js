// ====================================
// src/models/Media.js
// ====================================
const mongoose = require('mongoose');
const { SECCIONES_DISPONIBLES } = require('../utils/constants');

const mediaSchema = new mongoose.Schema({
  perfil: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: [true, 'El perfil es requerido']
  },
  tipo: {
    type: String,
    enum: ['foto', 'video'],
    required: [true, 'El tipo de media es requerido']
  },
  seccion: {
    type: String,
    enum: SECCIONES_DISPONIBLES.filter(s => 
      ['galeria_fotos', 'videos_memoriales', 'cronologia', 'testimonios', 'logros', 'hobbies'].includes(s)
    ),
    required: [true, 'La sección es requerida']
  },
  
  // Archivo original
  nombreOriginal: {
    type: String,
    required: [true, 'El nombre original es requerido'],
    trim: true
  },
  archivo: {
    url: {
      type: String,
      required: [true, 'La URL del archivo es requerida'],
      trim: true
    },
    tamaño: {
      type: Number,
      required: [true, 'El tamaño es requerido'],
      min: [1, 'El tamaño debe ser mayor a 0']
    },
    duracion: {
      type: Number, // para videos en segundos
      min: [0, 'La duración no puede ser negativa']
    },
    formato: {
      type: String,
      required: [true, 'El formato es requerido'],
      lowercase: true,
      trim: true
    },
    dimensiones: {
      ancho: Number,
      alto: Number
    },
    calidad: {
      type: String, // '720p', '1080p', 'original', etc.
      default: 'original'
    }
  },
  
  // Metadata
  titulo: {
    type: String,
    maxlength: [100, 'El título no puede exceder 100 caracteres'],
    trim: true
  },
  descripcion: {
    type: String,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    trim: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  orden: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'El tag no puede exceder 30 caracteres']
  }],
  
  // Estado de procesamiento
  estado: {
    type: String,
    enum: ['procesando', 'completado', 'error'],
    default: 'procesando'
  },
  errorMessage: {
    type: String,
    maxlength: [500, 'El mensaje de error no puede exceder 500 caracteres']
  },
  
  // Información de upload
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario que subió el archivo es requerido']
  }
}, {
  timestamps: true
});

// Índices
mediaSchema.index({ perfil: 1, seccion: 1, orden: 1 });
mediaSchema.index({ tipo: 1, estado: 1 });
mediaSchema.index({ uploadedBy: 1 });

// Método para obtener URL de thumbnail (para videos)
mediaSchema.methods.getThumbnailUrl = function() {
  if (this.tipo === 'video' && this.archivo.url) {
    // Generar URL de thumbnail basada en el ID del media
    const mediaDir = `/uploads/media/${this._id}`;
    return `${mediaDir}/${this._id}_thumb.jpg`;
  }
  return this.archivo.url;
};

// Método virtual para obtener URL completa
mediaSchema.virtual('fullUrl').get(function() {
  if (this.archivo.url.startsWith('http')) {
    return this.archivo.url;
  }
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}${this.archivo.url}`;
});

// Incluir virtuals en JSON
mediaSchema.set('toJSON', { virtuals: true });
mediaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Media', mediaSchema);