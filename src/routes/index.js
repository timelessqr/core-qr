const express = require('express');
const authRoutes = require('../modules/auth/routes/authRoutes');
const qrRoutes = require('../modules/qr/routes/qrRoutes');
const profileRoutes = require('../modules/profiles/routes/profileRoutes');
const mediaRoutes = require('../modules/media/routes/mediaRoutes');
const dashboardRoutes = require('../modules/dashboard/routes/dashboardRoutes');
const clientRoutes = require('../modules/clients/routes/clientRoutes');
const adminRoutes = require('../modules/admin/routes/adminRoutes');
const qrController = require('../modules/qr/controllers/qrController');

const router = express.Router();

// Ruta de información de la API
router.get('/', (req, res) => {
  res.json({
    message: '🌹 Lazos de Vida API - Sistema de Memoriales Digitales',
    version: '2.0.0',
    description: 'API para gestión de memoriales digitales con códigos QR. Modelo de negocio: Admin gestiona clientes y memoriales.',
    endpoints: {
      admin: {
        dashboard: 'GET /api/admin/dashboard (admin)',
        registerComplete: 'POST /api/admin/register-complete (admin)',
        search: 'GET /api/admin/search?q=termino (admin)',
        clientSummary: 'GET /api/admin/clients/:clientId/summary (admin)',
        quickMemorial: 'POST /api/admin/clients/:clientId/quick-memorial (admin)',
        metrics: 'GET /api/admin/metrics (admin)',
        health: 'GET /api/admin/health (admin)'
      },
      auth: {
        login: 'POST /api/auth/login (solo admin)',
        profile: 'GET /api/auth/profile (admin con token)'
      },
      clients: {
        register: 'POST /api/clients (admin)',
        getAll: 'GET /api/clients?page=1&limit=20&search=termino (admin)',
        getById: 'GET /api/clients/:id (admin)',
        getByCode: 'GET /api/clients/code/:codigo (admin)',
        update: 'PUT /api/clients/:id (admin)',
        delete: 'DELETE /api/clients/:id (admin)',
        search: 'GET /api/clients/search?q=termino (admin)',
        stats: 'GET /api/clients/stats (admin)'
      },
      profiles: {
        create: 'POST /api/profiles (admin - requiere clientId)',
        getAll: 'GET /api/profiles (admin)',
        getById: 'GET /api/profiles/:id (admin)',
        getClientProfiles: 'GET /api/profiles/client/:clientId (admin)',
        update: 'PUT /api/profiles/:id (admin)',
        delete: 'DELETE /api/profiles/:id (admin)',
        createBasic: 'POST /api/profiles/basic (admin - creación rápida)'
      },
      qr: {
        generate: 'POST /api/qr/generate/:profileId (admin)',
        getAll: 'GET /api/qr (admin)',
        stats: 'GET /api/qr/:code/stats (admin)'
      },
      media: {
        upload: 'POST /api/media/upload/:profileId (admin)',
        getByProfile: 'GET /api/media/profile/:profileId (admin)',
        getPublic: 'GET /api/media/public/:profileId (público)',
        updateMedia: 'PUT /api/media/:mediaId (admin)',
        deleteMedia: 'DELETE /api/media/:mediaId (admin)',
        reorder: 'PUT /api/media/reorder/:profileId (admin)',
        stats: 'GET /api/media/stats/:profileId (admin)',
        storageInfo: 'GET /api/media/storage/info (admin)',
        storageStats: 'GET /api/media/storage/stats (admin)'
      },
      dashboard: {
        get: 'GET /api/dashboard/:profileId (admin)',
        create: 'POST /api/dashboard/:profileId (admin)',
        updateConfig: 'PUT /api/dashboard/:profileId/config (admin)',
        updateSections: 'PUT /api/dashboard/:profileId/sections (admin)',
        changeTheme: 'PUT /api/dashboard/:profileId/theme (admin)',
        updatePrivacy: 'PUT /api/dashboard/:profileId/privacy (admin)',
        getPublic: 'GET /api/dashboard/public/:profileId (público)',
        templates: 'GET /api/dashboard/templates (público)'
      },
      public: {
        memorial: 'GET /api/memorial/:qrCode (público - acceso a memorial)',
        profilePublic: 'GET /api/profiles/:profileId/public (público)'
      }
    },
    businessModel: {
      description: 'Sistema para empresas funerarias',
      flow: [
        '1. Admin se logea en el sistema',
        '2. Admin registra cliente (nombre, teléfono, etc.)',
        '3. Admin crea memorial para el cliente',
        '4. Admin sube fotos/videos al memorial',
        '5. Sistema genera QR automáticamente',
        '6. Admin entrega QR físico al cliente',
        '7. Familiares escanean QR para ver memorial público'
      ],
      roles: {
        admin: 'Gestiona todo el sistema (empresa funeraria)',
        client: 'Registrado por admin, no tiene acceso al sistema',
        public: 'Accede a memoriales vía QR sin registro'
      }
    },
    status: 'Funcionando ✅',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Rutas de autenticación (solo login admin)
router.use('/auth', authRoutes);

// Rutas de administración
router.use('/admin', adminRoutes);

// Rutas de gestión de clientes
router.use('/clients', clientRoutes);

// Rutas de perfiles/memoriales
router.use('/profiles', profileRoutes);

// Rutas de QR
router.use('/qr', qrRoutes);

// Rutas de media
router.use('/media', mediaRoutes);

// Rutas de dashboard
router.use('/dashboard', dashboardRoutes);

// Ruta pública para acceder a memoriales vía QR (SIN autenticación)
router.get('/memorial/:qrCode', qrController.accessMemorial);

module.exports = router;
