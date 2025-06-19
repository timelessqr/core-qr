// ====================================
// src/modules/dashboard/routes/dashboardRoutes.js
// ====================================
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const auth = require('../../../middleware/auth');

const router = express.Router();

// ===============================
// MIDDLEWARE DE VALIDACIÓN
// ===============================

// Middleware para validar parámetros de perfil
const validateProfileId = (req, res, next) => {
  const { profileId } = req.params;
  
  if (!profileId || !profileId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'ID de perfil inválido'
    });
  }
  
  next();
};

// Middleware para validar datos de configuración
const validateConfigData = (req, res, next) => {
  const allowedConfigFields = [
    'tema', 'colorPrimario', 'colorSecundario', 'colorAccento',
    'fuente', 'tamanoFuente', 'permitirCondolencias', 'mostrarEstadisticas',
    'mostrarFechas', 'reproduccionAutomatica', 'efectosAnimacion'
  ];

  if (req.body && typeof req.body === 'object') {
    // Filtrar solo campos permitidos
    const filteredBody = {};
    Object.keys(req.body).forEach(key => {
      if (allowedConfigFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });
    req.body = filteredBody;
  }

  next();
};

// ===============================
// RUTAS PÚBLICAS
// ===============================

/**
 * @route   GET /api/dashboard/public/:profileId
 * @desc    Obtener configuración pública para memorial
 * @access  Public
 */
router.get('/public/:profileId',
  validateProfileId,
  dashboardController.getPublicConfig
);

/**
 * @route   GET /api/dashboard/templates
 * @desc    Obtener templates y configuraciones disponibles
 * @access  Public
 */
router.get('/templates',
  dashboardController.getTemplates
);

// ===============================
// RUTAS PRIVADAS
// ===============================

/**
 * @route   GET /api/dashboard/:profileId
 * @desc    Obtener dashboard de un perfil
 * @access  Private
 */
router.get('/:profileId',
  auth,
  validateProfileId,
  dashboardController.getByProfile
);

/**
 * @route   POST /api/dashboard/:profileId
 * @desc    Crear dashboard por defecto
 * @access  Private
 */
router.post('/:profileId',
  auth,
  validateProfileId,
  dashboardController.createDefault
);

/**
 * @route   PUT /api/dashboard/:profileId/config
 * @desc    Actualizar configuración general
 * @access  Private
 * @body    { tema?, colorPrimario?, colorSecundario?, ... }
 */
router.put('/:profileId/config',
  auth,
  validateProfileId,
  validateConfigData,
  dashboardController.updateConfig
);

/**
 * @route   PUT /api/dashboard/:profileId/sections
 * @desc    Actualizar secciones del dashboard
 * @access  Private
 * @body    { secciones: [{ tipo, activa, orden, configuracion, contenido }] }
 */
router.put('/:profileId/sections',
  auth,
  validateProfileId,
  dashboardController.updateSections
);

/**
 * @route   PUT /api/dashboard/:profileId/sections/reorder
 * @desc    Reordenar secciones
 * @access  Private
 * @body    { sectionsOrder: ["id1", "id2", "id3"] }
 */
router.put('/:profileId/sections/reorder',
  auth,
  validateProfileId,
  dashboardController.reorderSections
);

/**
 * @route   PUT /api/dashboard/:profileId/theme
 * @desc    Cambiar tema del dashboard
 * @access  Private
 * @body    { tema: "clasico|moderno|elegante", configuracion?: {...} }
 */
router.put('/:profileId/theme',
  auth,
  validateProfileId,
  dashboardController.changeTheme
);

/**
 * @route   PUT /api/dashboard/:profileId/privacy
 * @desc    Actualizar configuración de privacidad
 * @access  Private
 * @body    { publico, requierePassword?, password?, mensajeBienvenida? }
 */
router.put('/:profileId/privacy',
  auth,
  validateProfileId,
  dashboardController.updatePrivacy
);

/**
 * @route   PUT /api/dashboard/:profileId/seo
 * @desc    Actualizar configuración SEO
 * @access  Private
 * @body    { titulo?, descripcion?, palabrasClave? }
 */
router.put('/:profileId/seo',
  auth,
  validateProfileId,
  dashboardController.updateSEO
);

/**
 * @route   POST /api/dashboard/:profileId/duplicate/:sourceProfileId
 * @desc    Duplicar configuración de otro perfil
 * @access  Private
 */
router.post('/:profileId/duplicate/:sourceProfileId',
  auth,
  validateProfileId,
  (req, res, next) => {
    const { sourceProfileId } = req.params;
    if (!sourceProfileId || !sourceProfileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'ID de perfil fuente inválido'
      });
    }
    next();
  },
  dashboardController.duplicateConfig
);

/**
 * @route   POST /api/dashboard/:profileId/preview
 * @desc    Previsualizar configuración sin guardar
 * @access  Private
 * @body    { configuracion, secciones }
 */
router.post('/:profileId/preview',
  auth,
  validateProfileId,
  dashboardController.previewConfig
);

/**
 * @route   GET /api/dashboard/:profileId/export
 * @desc    Exportar configuración del dashboard
 * @access  Private
 */
router.get('/:profileId/export',
  auth,
  validateProfileId,
  dashboardController.exportConfig
);

/**
 * @route   POST /api/dashboard/:profileId/import
 * @desc    Importar configuración del dashboard
 * @access  Private
 * @body    { dashboard: { secciones, configuracion, seo } }
 */
router.post('/:profileId/import',
  auth,
  validateProfileId,
  dashboardController.importConfig
);

/**
 * @route   POST /api/dashboard/:profileId/reset
 * @desc    Restablecer configuración por defecto
 * @access  Private
 */
router.post('/:profileId/reset',
  auth,
  validateProfileId,
  dashboardController.resetToDefault
);

// ===============================
// MIDDLEWARE DE MANEJO DE ERRORES
// ===============================

// Manejo de errores específicos del dashboard
router.use((error, req, res, next) => {
  console.error('Error en rutas de dashboard:', error);
  
  // Errores de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors
    });
  }
  
  // Errores de duplicados
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Ya existe un dashboard para este perfil'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    })
  });
});

module.exports = router;