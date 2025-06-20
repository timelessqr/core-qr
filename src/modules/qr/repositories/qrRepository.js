// ====================================
// src/modules/qr/repositories/qrRepository.js
// ====================================
const QR = require('../../../models/QR');

class QRRepository {
  async create(qrData) {
    try {
      const qr = new QR(qrData);
      return await qr.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Código QR duplicado, regenerando...');
      }
      throw error;
    }
  }
  
  async findByCode(code) {
    return await QR.findOne({ 
      code, 
      isActive: true 
    })
    .populate('referenciaId') // Populate el perfil
    .populate('creadoPor', 'nombre email plan');
  }
  
  async findByReferenceId(referenciaId, tipo = 'profile') {
    return await QR.findOne({ 
      referenciaId, 
      tipo,
      isActive: true 
    });
  }
  
  async findByUserId(userId) {
    return await QR.find({ 
      creadoPor: userId,
      isActive: true 
    })
    .populate('referenciaId')
    .sort({ createdAt: -1 });
  }
  
  async updateStats(qrId, statsUpdate) {
    return await QR.findByIdAndUpdate(
      qrId,
      { 
        $inc: statsUpdate,
        'estadisticas.ultimaVisita': new Date()
      },
      { new: true }
    );
  }
  
  async registerVisit(code, visitData) {
    const qr = await this.findByCode(code);
    if (!qr) {
      throw new Error('QR no encontrado');
    }
    
    // Usar el método del modelo para registrar escaneo
    return await qr.registrarEscaneo(visitData.ip, visitData.userAgent);
  }
  
  async deactivate(id) {
    return await QR.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
  
  // 🗑️ NUEVO: Eliminación completa (hard delete)
  async hardDelete(id) {
    console.log('🗑️ Ejecutando hard delete de QR:', id);
    return await QR.findByIdAndDelete(id);
  }
  
  async getStats(code) {
    const qr = await QR.findOne({ code }).select('estadisticas code tipo');
    if (!qr) {
      throw new Error('QR no encontrado');
    }
    
    return {
      code: qr.code,
      tipo: qr.tipo,
      vistas: qr.estadisticas.vistas,
      escaneos: qr.estadisticas.escaneos,
      ultimaVisita: qr.estadisticas.ultimaVisita,
      visitasUnicas: qr.estadisticas.visitasUnicas.length
    };
  }
}

module.exports = new QRRepository();