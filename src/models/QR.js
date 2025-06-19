const mongoose = require('mongoose'); // ← ESTO FALTABA

const qrSchema = new mongoose.Schema({
  // Código único del QR
  code: {
    type: String,
    required: [true, 'El código QR es requerido'],
    unique: true,
    trim: true,
    minlength: [8, 'El código debe tener al menos 8 caracteres'],
    maxlength: [32, 'El código no puede exceder 32 caracteres']
  },
  
  // URL completa del memorial
  url: {
    type: String,
    required: [true, 'La URL es requerida'],
    trim: true
  },
  
  // Tipo de QR (profile, event, gallery, etc.)
  tipo: {
    type: String,
    enum: ['profile', 'event', 'gallery'],
    default: 'profile',
    required: true
  },
  
  // Referencia al recurso (perfil, evento, etc.)
  referenciaId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'La referencia es requerida'],
    refPath: 'tipoModelo'
  },
  
  // Modelo al que referencia (Profile, Event, etc.)
  tipoModelo: {
    type: String,
    enum: ['Profile', 'Event', 'Gallery'],
    default: 'Profile',
    required: true
  },
  
  // Imagen del QR (opcional, puede generarse on-the-fly)
  imagenUrl: {
    type: String,
    trim: true
  },
  
  // Estadísticas del QR
  estadisticas: {
    vistas: {
      type: Number,
      default: 0,
      min: 0
    },
    escaneos: {
      type: Number,
      default: 0,
      min: 0
    },
    ultimaVisita: {
      type: Date,
      default: Date.now
    },
    visitasUnicas: [{
      ip: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      userAgent: String
    }]
  },
  
  // Estado del QR
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Usuario que creó el QR
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices
// Code ya tiene índice único automático por unique: true
qrSchema.index({ referenciaId: 1, tipo: 1 });
qrSchema.index({ creadoPor: 1 });
qrSchema.index({ isActive: 1 });

// Método para incrementar vistas
qrSchema.methods.incrementViews = function() {
  this.estadisticas.vistas += 1;
  this.estadisticas.ultimaVisita = new Date();
  return this.save();
};

// Método para registrar escaneo único
qrSchema.methods.registrarEscaneo = function(ip, userAgent) {
  // Verificar si ya existe una visita de esta IP en las últimas 24h
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const visitaReciente = this.estadisticas.visitasUnicas.find(
    visita => visita.ip === ip && visita.timestamp > hace24h
  );
  
  if (!visitaReciente) {
    this.estadisticas.escaneos += 1;
    this.estadisticas.visitasUnicas.push({
      ip,
      userAgent,
      timestamp: new Date()
    });
    
    // Mantener solo las últimas 100 visitas para no saturar la BD
    if (this.estadisticas.visitasUnicas.length > 100) {
      this.estadisticas.visitasUnicas = this.estadisticas.visitasUnicas
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
    }
  }
  
  return this.incrementViews();
};

module.exports = mongoose.model('QR', qrSchema);