// ====================================
// src/models/Comentario.js
// ====================================
const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  memorial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: [true, 'El memorial es requerido']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    minlength: [2, 'El nombre debe tener al menos 2 caracteres']
  },
  mensaje: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    trim: true,
    maxlength: [1000, 'El mensaje no puede exceder 1000 caracteres'],
    minlength: [5, 'El mensaje debe tener al menos 5 caracteres']
  },
  relacion: {
    type: String,
    trim: true,
    maxlength: [100, 'La relación no puede exceder 100 caracteres'],
    default: ''
  },
  codigoUsado: {
    type: String,
    required: [true, 'El código de validación es requerido'],
    trim: true
  },
  estado: {
    type: String,
    enum: ['activo', 'eliminado'],
    default: 'activo'
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índices
comentarioSchema.index({ memorial: 1, estado: 1 });
comentarioSchema.index({ createdAt: -1 });
comentarioSchema.index({ memorial: 1, createdAt: -1 });

// Método para formatear comentario para vista pública
comentarioSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    nombre: this.nombre,
    mensaje: this.mensaje,
    relacion: this.relacion,
    fechaCreacion: this.createdAt,
    fechaRelativa: this.getFechaRelativa()
  };
};

// Método para obtener fecha relativa (ej: "hace 2 días")
comentarioSchema.methods.getFechaRelativa = function() {
  const ahora = new Date();
  const diferencia = ahora - this.createdAt;
  
  const minutos = Math.floor(diferencia / (1000 * 60));
  const horas = Math.floor(diferencia / (1000 * 60 * 60));
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  
  if (minutos < 60) {
    return minutos === 1 ? 'hace 1 minuto' : `hace ${minutos} minutos`;
  } else if (horas < 24) {
    return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`;
  } else if (dias < 30) {
    return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
  } else {
    return this.createdAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

// Método estático para obtener comentarios públicos de un memorial
comentarioSchema.statics.getPublicComments = async function(memorialId) {
  return this.find({
    memorial: memorialId,
    estado: 'activo'
  })
  .sort({ createdAt: -1 })
  .limit(100); // Máximo 100 comentarios
};

// Método estático para contar comentarios de un memorial
comentarioSchema.statics.countByMemorial = async function(memorialId) {
  return this.countDocuments({
    memorial: memorialId,
    estado: 'activo'
  });
};

module.exports = mongoose.model('Comentario', comentarioSchema);