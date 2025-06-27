// ====================================
// src/models/Media.js
// ====================================
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  memorial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: [true, 'El memorial es requerido']
  },
  tipo: {
    type: String,
    enum: ['foto', 'video', 'archivo_mp3'],
    required: [true, 'El tipo de media es requerido']
  },
  seccion: {
    type: String,
    enum: ['galeria', 'fondos', 'musica', 'perfil'],
    default: 'galeria',
    required: [true, 'La sección es requerida']
  },
  titulo: {
    type: String,
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres'],
    default: ''
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    default: ''
  },
  archivo: {
    nombreOriginal: {
      type: String,
      required: [true, 'El nombre original es requerido']
    },
    nombreArchivo: {
      type: String,
      required: [true, 'El nombre del archivo es requerido']
    },
    ruta: {
      type: String,
      required: [true, 'La ruta del archivo es requerida']
    },
    url: {
      type: String,
      required: [true, 'La URL del archivo es requerida']
    },
    mimeType: {
      type: String,
      required: [true, 'El tipo MIME es requerido']
    },
    tamaño: {
      type: Number,
      required: [true, 'El tamaño del archivo es requerido'],
      min: [0, 'El tamaño no puede ser negativo']
    }
  },
  dimensiones: {
    ancho: {
      type: Number,
      min: [0, 'El ancho no puede ser negativo']
    },
    alto: {
      type: Number,
      min: [0, 'El alto no puede ser negativo']
    },
    duracion: {
      type: Number, // para videos en segundos
      min: [0, 'La duración no puede ser negativa']
    }
  },
  metadata: {
    fechaOriginal: Date, // fecha cuando se tomó la foto/video
    ubicacion: {
      latitud: Number,
      longitud: Number,
      direccion: String
    },
    camara: String,
    configuracion: {
      iso: Number,
      apertura: String,
      velocidad: String
    },
    // Campos específicos para YouTube
    videoId: String,
    thumbnail: String,
    embedUrl: String
  },
  orden: {
    type: Number,
    default: 0,
    min: [0, 'El orden no puede ser negativo']
  },
  esPortada: {
    type: Boolean,
    default: false
  },
  estaActivo: {
    type: Boolean,
    default: true
  },
  procesado: {
    estado: {
      type: String,
      enum: ['pendiente', 'procesando', 'completado', 'error'],
      default: 'pendiente'
    },
    versiones: {
      thumbnail: String, // URL del thumbnail
      small: String,     // URL de versión pequeña
      medium: String,    // URL de versión mediana
      large: String      // URL de versión grande
    },
    fechaProcesado: Date,
    errorMensaje: String
  },
  estadisticas: {
    vistas: {
      type: Number,
      default: 0,
      min: [0, 'Las vistas no pueden ser negativas']
    },
    descargas: {
      type: Number,
      default: 0,
      min: [0, 'Las descargas no pueden ser negativas']
    },
    compartidos: {
      type: Number,
      default: 0,
      min: [0, 'Los compartidos no pueden ser negativos']
    }
  }
}, {
  timestamps: true
});

// Índices
mediaSchema.index({ memorial: 1, tipo: 1, estaActivo: 1 }, { background: true });
mediaSchema.index({ memorial: 1, seccion: 1, estaActivo: 1 }, { background: true });
mediaSchema.index({ memorial: 1, orden: 1 }, { background: true });
mediaSchema.index({ memorial: 1, esPortada: 1 }, { background: true });
mediaSchema.index({ createdAt: -1 }, { background: true });
mediaSchema.index({ 'archivo.url': 1 }, { background: true });

// Método para obtener URL apropiada según el tamaño
mediaSchema.methods.getUrlPorTamaño = function(tamaño = 'medium') {
  const versiones = this.procesado.versiones;
  
  switch (tamaño) {
    case 'thumbnail':
      return versiones.thumbnail || this.archivo.url;
    case 'small':
      return versiones.small || this.archivo.url;
    case 'medium':
      return versiones.medium || this.archivo.url;
    case 'large':
      return versiones.large || this.archivo.url;
    case 'original':
    default:
      return this.archivo.url;
  }
};

// Método para incrementar vistas
mediaSchema.methods.incrementarVistas = async function() {
  this.estadisticas.vistas += 1;
  return await this.save();
};

// Método para formatear para vista pública
mediaSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    tipo: this.tipo,
    titulo: this.titulo,
    descripcion: this.descripcion,
    url: this.archivo.url,
    urlThumbnail: this.getUrlPorTamaño('thumbnail'),
    urlMedium: this.getUrlPorTamaño('medium'),
    dimensiones: this.dimensiones,
    orden: this.orden,
    esPortada: this.esPortada,
    fechaSubida: this.createdAt,
    fechaOriginal: this.metadata.fechaOriginal
  };
};

// Método para formatear para admin
mediaSchema.methods.toAdminJSON = function() {
  return {
    id: this._id,
    tipo: this.tipo,
    titulo: this.titulo,
    descripcion: this.descripcion,
    archivo: this.archivo,
    dimensiones: this.dimensiones,
    metadata: this.metadata,
    orden: this.orden,
    esPortada: this.esPortada,
    estaActivo: this.estaActivo,
    procesado: this.procesado,
    estadisticas: this.estadisticas,
    fechaSubida: this.createdAt,
    fechaActualizacion: this.updatedAt
  };
};

// Middleware para mantener solo una foto de portada por memorial
mediaSchema.pre('save', async function(next) {
  if (this.esPortada && this.isModified('esPortada')) {
    // Remover portada de otras fotos del mismo memorial
    await this.constructor.updateMany(
      { 
        memorial: this.memorial, 
        _id: { $ne: this._id },
        tipo: this.tipo 
      },
      { esPortada: false }
    );
  }
  next();
});

// Método estático para obtener media por memorial
mediaSchema.statics.getByMemorial = async function(memorialId, tipo = null, activo = true) {
  const filtro = { 
    memorial: memorialId,
    estaActivo: activo
  };
  
  if (tipo) {
    filtro.tipo = tipo;
  }
  
  return this.find(filtro).sort({ orden: 1, createdAt: 1 });
};

// Método estático para obtener portada
mediaSchema.statics.getPortada = async function(memorialId, tipo = 'foto') {
  return this.findOne({
    memorial: memorialId,
    tipo,
    esPortada: true,
    estaActivo: true
  });
};

// Método estático para contar media por memorial
mediaSchema.statics.countByMemorial = async function(memorialId, tipo = null) {
  const filtro = { 
    memorial: memorialId,
    estaActivo: true
  };
  
  if (tipo) {
    filtro.tipo = tipo;
  }
  
  return this.countDocuments(filtro);
};

module.exports = mongoose.model('Media', mediaSchema);