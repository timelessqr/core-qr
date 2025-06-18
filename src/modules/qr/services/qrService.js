// ====================================
// src/modules/qr/services/qrService.js
// ====================================
const qrRepository = require('../repositories/qrRepository');
const qrImageGenerator = require('../../../utils/qrImageGenerator');
const { v4: uuidv4 } = require('uuid');
const { QR_TYPES, URLS, MESSAGES } = require('../../../utils/constants');

class QRService {
  async generateUniqueCode() {
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      // Generar código único de 12 caracteres
      const code = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
      
      // Verificar que no exista
      const existing = await qrRepository.findByCode(code);
      if (!existing) {
        return code;
      }
      
      attempts++;
    }
    
    throw new Error('No se pudo generar un código único después de varios intentos');
  }
  
  async createQRForProfile(profileId, userId, options = {}) {
    try {
      // Verificar si ya existe un QR para este perfil
      const existingQR = await qrRepository.findByReferenceId(profileId, QR_TYPES.PROFILE);
      if (existingQR) {
        throw new Error('Ya existe un QR para este perfil');
      }
      
      // Generar código único
      const code = await this.generateUniqueCode();
      
      // Crear URL del memorial
      const url = `${URLS.QR_BASE}/${code}`;
      
      // Crear QR en base de datos
      const qrData = {
        code,
        url,
        tipo: QR_TYPES.PROFILE,
        referenciaId: profileId,
        tipoModelo: 'Profile',
        creadoPor: userId,
        estadisticas: {
          vistas: 0,
          escaneos: 0,
          ultimaVisita: new Date(),
          visitasUnicas: []
        }
      };
      
      const qr = await qrRepository.create(qrData);
      
      // Generar imagen QR
      let qrImageBuffer = null;
      try {
        qrImageBuffer = await qrImageGenerator.generateProfileQR(code, options);
      } catch (imageError) {
        console.warn('Error generando imagen QR:', imageError.message);
        // Continuar sin imagen, se puede generar después
      }
      
      return {
        id: qr._id,
        code: qr.code,
        url: qr.url,
        tipo: qr.tipo,
        qrImage: qrImageBuffer ? qrImageGenerator.bufferToDataURL(qrImageBuffer) : null,
        createdAt: qr.createdAt
      };
    } catch (error) {
      throw error;
    }
  }
  
  async getQRByCode(code) {
    try {
      const qr = await qrRepository.findByCode(code);
      if (!qr) {
        throw new Error(MESSAGES.ERROR.QR_NOT_FOUND);
      }
      
      return {
        id: qr._id,
        code: qr.code,
        url: qr.url,
        tipo: qr.tipo,
        referencia: qr.referenciaId,
        creadoPor: qr.creadoPor,
        estadisticas: qr.estadisticas,
        createdAt: qr.createdAt
      };
    } catch (error) {
      throw error;
    }
  }
  
  async getUserQRs(userId) {
    try {
      const qrs = await qrRepository.findByUserId(userId);
      
      return qrs.map(qr => ({
        id: qr._id,
        code: qr.code,
        url: qr.url,
        tipo: qr.tipo,
        referencia: qr.referenciaId,
        estadisticas: {
          vistas: qr.estadisticas.vistas,
          escaneos: qr.estadisticas.escaneos,
          ultimaVisita: qr.estadisticas.ultimaVisita
        },
        createdAt: qr.createdAt
      }));
    } catch (error) {
      throw error;
    }
  }
  
  async regenerateQR(qrId, userId) {
    try {
      // Verificar que el QR pertenece al usuario
      const existingQR = await qrRepository.findByCode();
      // Implementación simplificada por ahora
      throw new Error('Regenerar QR no implementado aún');
    } catch (error) {
      throw error;
    }
  }
  
  async trackVisit(code, visitData) {
    try {
      const qr = await qrRepository.registerVisit(code, visitData);
      return {
        code: qr.code,
        vistas: qr.estadisticas.vistas,
        escaneos: qr.estadisticas.escaneos
      };
    } catch (error) {
      throw error;
    }
  }
  
  async getQRStats(code, userId) {
    try {
      const stats = await qrRepository.getStats(code);
      
      // Verificar permisos si es necesario
      // Por ahora retornamos las estadísticas
      
      return stats;
    } catch (error) {
      throw error;
    }
  }
  
  async generateQRImage(code, options = {}) {
    try {
      const qr = await qrRepository.findByCode(code);
      if (!qr) {
        throw new Error(MESSAGES.ERROR.QR_NOT_FOUND);
      }
      
      const qrImageBuffer = await qrImageGenerator.generateProfileQR(code, options);
      
      return {
        image: qrImageGenerator.bufferToDataURL(qrImageBuffer),
        code: qr.code,
        url: qr.url
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new QRService();