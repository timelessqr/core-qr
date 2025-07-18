// ====================================
// src/modules/admin/services/adminService.js
// ====================================
const clientRepository = require('../../clients/repositories/clientRepository');
const profileRepository = require('../../profiles/repositories/profileRepository');
const qrRepository = require('../../qr/repositories/qrRepository');
const profileService = require('../../profiles/services/profileService');
const clientService = require('../../clients/services/clientService');

class AdminService {
  /**
   * Obtener dashboard principal del admin
   */
  async getDashboard() {
    try {
      // Obtener estadísticas principales
      const [clientStats, profileStats] = await Promise.all([
        clientRepository.getStats(),
        profileRepository.getGeneralStats()
      ]);

      // Obtener clientes recientes
      const recentClients = await clientRepository.getRecent(5);

      // Obtener perfiles recientes
      const recentProfiles = await profileRepository.findAllWithClient({
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      return {
        estadisticas: {
          clientes: {
            total: clientStats.total || 0,
            activos: clientStats.activos || 0,
            nuevosEsteMes: clientStats.registradosEsteMes || 0
          },
          memoriales: {
            total: profileStats.total || 0,
            publicos: profileStats.publicos || 0,
            privados: profileStats.privados || 0,
            nuevosEsteMes: profileStats.creadosEsteMes || 0
          }
        },
        actividades: {
          clientesRecientes: recentClients.map(client => ({
            id: client._id,
            nombre: `${client.nombre} ${client.apellido}`,
            codigo: client.codigoCliente,
            telefono: client.telefono,
            email: client.email, // ✅ AGREGADO: Campo email faltante
            fechaRegistro: client.fechaRegistro
          })),
          memorialesRecientes: recentProfiles.profiles.map(profile => ({
            id: profile._id,
            nombre: profile.nombre,
            cliente: profile.cliente ? {
              nombre: `${profile.cliente.nombre} ${profile.cliente.apellido}`,
              codigo: profile.cliente.codigoCliente
            } : null,
            fechaCreacion: profile.createdAt,
            qr: profile.qr ? profile.qr.code : null
          }))
        }
      };

    } catch (error) {
      throw new Error(`Error obteniendo dashboard: ${error.message}`);
    }
  }

  /**
   * Proceso completo: registrar cliente y crear memorial
   */
  async registerClientWithMemorial(clientData, memorialData) {
    try {
      // 1. Registrar cliente
      const clientResult = await clientService.registerClient(clientData);
      const clientId = clientResult.client.id;

      // 2. Crear memorial para el cliente
      const memorial = await profileService.createFromAdmin(memorialData, clientId);

      return {
        cliente: clientResult.client,
        memorial: {
          id: memorial.id,
          nombre: memorial.nombre,
          qr: memorial.qr
        },
        resumen: {
          clienteCodigo: clientResult.client.codigoCliente,
          memorialNombre: memorial.nombre,
          qrCode: memorial.qr?.code,
          qrUrl: memorial.qr?.url
        }
      };

    } catch (error) {
      throw new Error(`Error en registro completo: ${error.message}`);
    }
  }

  /**
   * Buscar en todo el sistema
   */
  async globalSearch(termino) {
    try {
      if (!termino || termino.trim().length < 2) {
        throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
      }

      const [clients, profiles] = await Promise.all([
        clientRepository.search(termino, 5),
        profileRepository.search(termino, 5)
      ]);

      return {
        clientes: clients.map(client => ({
          id: client._id,
          nombre: `${client.nombre} ${client.apellido}`,
          codigo: client.codigoCliente,
          telefono: client.telefono,
          tipo: 'cliente'
        })),
        memoriales: profiles.map(profile => ({
          id: profile._id,
          nombre: profile.nombre,
          cliente: profile.cliente ? {
            nombre: `${profile.cliente.nombre} ${profile.cliente.apellido}`,
            codigo: profile.cliente.codigoCliente
          } : null,
          qr: profile.qr?.code,
          tipo: 'memorial'
        }))
      };

    } catch (error) {
      throw new Error(`Error en búsqueda global: ${error.message}`);
    }
  }

  /**
   * Obtener resumen de un cliente con sus memoriales
   */
  async getClientSummary(clientId) {
    try {
      // Obtener información del cliente
      const client = await clientRepository.findById(clientId);
      
      // Obtener perfiles del cliente
      const profiles = await profileRepository.findByClientId(clientId);

      // Obtener estadísticas del cliente
      const stats = await profileRepository.getClientStats(clientId);

      return {
        cliente: {
          id: client._id,
          nombre: `${client.nombre} ${client.apellido}`,
          codigo: client.codigoCliente,
          telefono: client.telefono,
          email: client.email,
          direccion: client.direccion,
          observaciones: client.observaciones,
          fechaRegistro: client.fechaRegistro
        },
        memoriales: profiles.map(profile => ({
          id: profile._id,
          nombre: profile.nombre,
          fechaNacimiento: profile.fechaNacimiento,
          fechaFallecimiento: profile.fechaFallecimiento,
          qr: profile.qr ? {
            code: profile.qr.code,
            url: profile.qr.url,
            vistas: profile.qr.estadisticas?.vistas || 0,
            escaneos: profile.qr.estadisticas?.escaneos || 0
          } : null,
          isPublic: profile.isPublic,
          fechaCreacion: profile.createdAt
        })),
        estadisticas: stats
      };

    } catch (error) {
      throw new Error(`Error obteniendo resumen del cliente: ${error.message}`);
    }
  }

  /**
   * Crear memorial rápido (datos mínimos)
   */
  async createQuickMemorial(clientId, memorialData) {
    try {
      const requiredFields = ['nombre', 'fechaNacimiento', 'fechaFallecimiento'];
      const missingFields = requiredFields.filter(field => !memorialData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
      }

      const memorial = await profileService.createFromAdmin(memorialData, clientId);

      return {
        id: memorial.id,
        nombre: memorial.nombre,
        edadAlFallecer: memorial.edadAlFallecer,
        qr: {
          code: memorial.qr?.code,
          url: memorial.qr?.url,
          imagen: memorial.qr?.qrImage
        },
        mensaje: 'Memorial creado exitosamente. QR listo para entregar al cliente.'
      };

    } catch (error) {
      throw new Error(`Error creando memorial rápido: ${error.message}`);
    }
  }

  /**
   * Obtener métricas del sistema
   */
  async getSystemMetrics() {
    try {
      const [
        clientStats,
        profileStats,
        qrMetrics
      ] = await Promise.all([
        clientRepository.getStats(),
        profileRepository.getGeneralStats(),
        this.getQRMetrics()
      ]);

      return {
        totales: {
          clientes: clientStats.total || 0,
          memoriales: profileStats.total || 0,
          qrsGenerados: qrMetrics.totalQRs || 0
        },
        tendencias: {
          clientesEsteMes: clientStats.registradosEsteMes || 0,
          memorialesEsteMes: profileStats.creadosEsteMes || 0,
          crecimiento: {
            clientes: this.calculateGrowth(clientStats.registradosEsteMes || 0, 0), // Simplificado
            memoriales: this.calculateGrowth(profileStats.creadosEsteMes || 0, 0) // Simplificado
          }
        },
        qr: qrMetrics // Incluir métricas específicas de QR
      };

    } catch (error) {
      throw new Error(`Error obteniendo métricas: ${error.message}`);
    }
  }
  
  /**
   * Obtener métricas específicas de QR
   */
  async getQRMetrics() {
    try {
      const QR = require('../../../models/QR');
      
      const [
        totalQRs,
        totalScans,
        activeQRs,
        mostScannedQR
      ] = await Promise.all([
        QR.countDocuments({ isActive: true }),
        QR.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: null, total: { $sum: '$estadisticas.escaneos' } } }
        ]),
        QR.countDocuments({ isActive: true }),
        QR.findOne(
          { isActive: true },
          null,
          { sort: { 'estadisticas.escaneos': -1 } }
        ).populate('referenciaId', 'nombre')
      ]);
      
      return {
        totalQRs,
        totalScans: totalScans[0]?.total || 0,
        activeQRs,
        mostScanned: mostScannedQR ? {
          code: mostScannedQR.code,
          nombre: mostScannedQR.referenciaId?.nombre || 'N/A',
          escaneos: mostScannedQR.estadisticas?.escaneos || 0
        } : null
      };
    } catch (error) {
      console.error('Error obteniendo métricas de QR:', error);
      return {
        totalQRs: 0,
        totalScans: 0,
        activeQRs: 0,
        mostScanned: null
      };
    }
  }

  /**
   * Calcular porcentaje de crecimiento
   */
  calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}

module.exports = new AdminService();
