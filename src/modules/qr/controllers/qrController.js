const qrService = require('../services/qrService');
const { responseHelper } = require('../../../utils/responseHelper');
const { MESSAGES } = require('../../../utils/constants');

class QRController {
  async generateForProfile(req, res) {
    try {
      const { profileId } = req.params;
      const userId = req.user.id;
      const options = req.body || {};
      
      const qr = await qrService.createQRForProfile(profileId, userId, options);
      
      responseHelper.success(
        res, 
        qr, 
        MESSAGES.SUCCESS.QR_GENERATED, 
        201
      );
    } catch (error) {
      console.error('Error generando QR:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async getByCode(req, res) {
    try {
      const { code } = req.params;
      
      const qr = await qrService.getQRByCode(code);
      
      responseHelper.success(res, qr, 'QR encontrado');
    } catch (error) {
      console.error('Error obteniendo QR:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
  
  async getUserQRs(req, res) {
    try {
      const userId = req.user.id;
      
      const qrs = await qrService.getUserQRs(userId);
      
      responseHelper.success(res, qrs, 'QRs del usuario obtenidos');
    } catch (error) {
      console.error('Error obteniendo QRs del usuario:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  async trackVisit(req, res) {
    try {
      const { code } = req.params;
      const visitData = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      };
      
      const result = await qrService.trackVisit(code, visitData);
      
      responseHelper.success(res, result, 'Visita registrada');
    } catch (error) {
      console.error('Error registrando visita:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
  
  async getStats(req, res) {
    try {
      const { code } = req.params;
      const userId = req.user.id;
      
      const stats = await qrService.getQRStats(code, userId);
      
      responseHelper.success(res, stats, 'Estadísticas obtenidas');
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      responseHelper.error(res, error.message, 404);
    }
  }
  
  async generateImage(req, res) {
    try {
      const { code } = req.params;
      const options = req.body || {};
      
      const result = await qrService.generateQRImage(code, options);
      
      responseHelper.success(res, result, 'Imagen QR generada');
    } catch (error) {
      console.error('Error generando imagen QR:', error);
      responseHelper.error(res, error.message, 400);
    }
  }
  
  // Endpoint público para acceder al memorial (sin autenticación) - VERSIÓN MEJORADA
  async accessMemorial(req, res) {
    try {
      const { qrCode } = req.params;
      
      // Registrar visita
      const visitData = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      };
      
      // Trackear visita (sin fallar si hay error)
      try {
        await qrService.trackVisit(qrCode, visitData);
      } catch (trackError) {
        console.warn('Error tracking visita:', trackError.message);
      }
      
      // Obtener datos del QR
      const qr = await qrService.getQRByCode(qrCode);
      
      if (qr.tipo !== 'profile') {
        return responseHelper.error(res, 'Tipo de QR no soportado', 400);
      }
      
      // Obtener datos del memorial usando el profile service
      const profileService = require('../../profiles/services/profileService');
      
      try {
        // Usar el ID de la referencia (profileId) no el objeto completo
        const profileId = qr.referencia && qr.referencia._id ? qr.referencia._id : qr.referencia;
        const memorial = await profileService.getPublicMemorial(profileId);
        
        // Retornar datos del memorial
        responseHelper.success(res, {
          memorial,
          qr: {
            code: qr.code,
            tipo: qr.tipo,
            vistas: qr.estadisticas?.vistas || 0,
            escaneos: qr.estadisticas?.escaneos || 0
          },
          visitRegistered: true
        }, 'Memorial encontrado');
        
      } catch (memorialError) {
        console.error('Error obteniendo memorial:', memorialError.message);
        responseHelper.error(res, 'Memorial no encontrado o no público', 404);
      }
      
    } catch (error) {
      console.error('Error accediendo al memorial:', error);
      responseHelper.error(res, 'Memorial no encontrado', 404);
    }
  }
}

module.exports = new QRController();