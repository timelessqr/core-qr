// ====================================
// src/models/Client.js
// ====================================
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  // Información básica del cliente
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
  },
  
  // Contacto
  telefono: {
    type: String,
    required: [true, 'El teléfono es requerido'],
    trim: true,
    match: [/^[\d\-\+\(\)\s]+$/, 'Formato de teléfono inválido']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  
  // Código único para identificar fácilmente
  codigoCliente: {
    type: String,
    unique: true,
    uppercase: true
  },
  
  // Información adicional
  direccion: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección no puede exceder 200 caracteres']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
  },
  
  // Estado del cliente
  activo: {
    type: Boolean,
    default: true
  },
  
  // Metadatos
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
clientSchema.index({ telefono: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ apellido: 1, nombre: 1 });
clientSchema.index({ fechaRegistro: -1 });

// Middleware para generar código de cliente
clientSchema.pre('save', async function(next) {
  if (this.isNew && !this.codigoCliente) {
    // Generar código único CL-001, CL-002, etc.
    let codigoGenerado;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      attempts++;
      
      // Buscar todos los códigos existentes y encontrar el próximo número
      const existingClients = await this.constructor.find(
        { codigoCliente: { $regex: /^CL-\d+$/ } },
        { codigoCliente: 1 }
      ).lean();
      
      // Extraer números y encontrar el máximo
      const numbers = existingClients.map(client => {
        const match = client.codigoCliente.match(/^CL-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
      
      const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNumber = maxNumber + 1;
      
      codigoGenerado = `CL-${String(nextNumber).padStart(3, '0')}`;
      
      // Verificar si ya existe (doble verificación)
      const exists = await this.constructor.findOne({ codigoCliente: codigoGenerado });
      if (!exists) {
        this.codigoCliente = codigoGenerado;
        break;
      }
      
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      throw new Error('No se pudo generar un código único después de múltiples intentos');
    }
  }
  
  if (this.isModified() && !this.isNew) {
    this.ultimaActualizacion = new Date();
  }
  
  next();
});

// Método para obtener nombre completo
clientSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

// Método para obtener información de contacto
clientSchema.methods.getContactInfo = function() {
  return {
    nombre: this.nombreCompleto,
    telefono: this.telefono,
    email: this.email || 'No registrado',
    codigo: this.codigoCliente
  };
};

// Método para búsqueda
clientSchema.statics.buscar = function(termino) {
  const regex = new RegExp(termino, 'i');
  return this.find({
    $or: [
      { nombre: regex },
      { apellido: regex },
      { codigoCliente: regex },
      { telefono: regex },
      { email: regex }
    ],
    activo: true
  }).sort({ fechaRegistro: -1 });
};

// 🔧 MÉTODO CORREGIDO: Obtener estadísticas solo de clientes activos
clientSchema.statics.getEstadisticas = function() {
  return this.aggregate([
    {
      // ✅ FILTRAR: Solo clientes activos
      $match: { activo: true }
    },
    {
      $group: {
        _id: null,
        // ✅ CORREGIDO: Solo cuenta clientes activos
        total: { $sum: 1 },
        activos: { $sum: 1 }, // Todos los que pasaron el filtro son activos
        registradosEsteMes: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$fechaRegistro',
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// 🔧 MÉTODO ADICIONAL: Estadísticas detalladas (activos vs inactivos)
clientSchema.statics.getEstadisticasDetalladas = function() {
  return this.aggregate([
    {
      $facet: {
        // Estadísticas de clientes activos
        activos: [
          { $match: { activo: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              registradosEsteMes: {
                $sum: {
                  $cond: [
                    {
                      $gte: [
                        '$fechaRegistro',
                        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ],
        // Estadísticas de clientes inactivos (para referencia)
        inactivos: [
          { $match: { activo: false } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 }
            }
          }
        ]
      }
    },
    {
      $project: {
        total: { $ifNull: [{ $arrayElemAt: ['$activos.total', 0] }, 0] },
        activos: { $ifNull: [{ $arrayElemAt: ['$activos.total', 0] }, 0] },
        inactivos: { $ifNull: [{ $arrayElemAt: ['$inactivos.total', 0] }, 0] },
        registradosEsteMes: { $ifNull: [{ $arrayElemAt: ['$activos.registradosEsteMes', 0] }, 0] }
      }
    }
  ]);
};

// Configurar toJSON para no exponer información sensible
clientSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Client', clientSchema);
