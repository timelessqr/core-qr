const express = require('express');
const authRoutes = require('../modules/auth/routes/authRoutes');
const qrRoutes = require('../modules/qr/routes/qrRoutes');
const profileRoutes = require('../modules/profiles/routes/profileRoutes');
const mediaRoutes = require('../modules/media/routes/mediaRoutes');
const dashboardRoutes = require('../modules/dashboard/routes/dashboardRoutes');
const qrController = require('../modules/qr/controllers/qrController');

const router = express.Router();

// Ruta de información de la API
router.get('/', (req, res) => {
  res.json({
    message: '🌹 Lazos de Vida API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (con token)'
      },
      profiles: {
        create: 'POST /api/profiles (con token)',
        myProfiles: 'GET /api/profiles/my-profiles (con token)',
        getById: 'GET /api/profiles/:id (con token)',
        update: 'PUT /api/profiles/:id (con token)',
        delete: 'DELETE /api/profiles/:id (con token)'
      },
      qr: {
        generate: 'POST /api/qr/generate/:profileId (con token)',
        myQrs: 'GET /api/qr/my-qrs (con token)',
        stats: 'GET /api/qr/:code/stats (con token)'
      },
      media: {
        upload: 'POST /api/media/upload/:profileId (con token)',
        getByProfile: 'GET /api/media/profile/:profileId (con token)',
        getPublic: 'GET /api/media/public/:profileId (público)',
        updateMedia: 'PUT /api/media/:mediaId (con token)',
        deleteMedia: 'DELETE /api/media/:mediaId (con token)',
        reorder: 'PUT /api/media/reorder/:profileId (con token)',
        stats: 'GET /api/media/stats/:profileId (con token)'
      },
      dashboard: {
        get: 'GET /api/dashboard/:profileId (con token)',
        create: 'POST /api/dashboard/:profileId (con token)',
        updateConfig: 'PUT /api/dashboard/:profileId/config (con token)',
        updateSections: 'PUT /api/dashboard/:profileId/sections (con token)',
        changeTheme: 'PUT /api/dashboard/:profileId/theme (con token)',
        updatePrivacy: 'PUT /api/dashboard/:profileId/privacy (con token)',
        getPublic: 'GET /api/dashboard/public/:profileId (público)',
        templates: 'GET /api/dashboard/templates (público)'
      },
      public: {
        memorial: 'GET /api/memorial/:qrCode (público)'
      }
    },
    status: 'Funcionando ✅',
    timestamp: new Date().toISOString()
  });
});

// Rutas de autenticación
router.use('/auth', authRoutes);

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