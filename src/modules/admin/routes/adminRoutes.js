// ====================================
// src/modules/admin/routes/adminRoutes.js
// ====================================
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../../../middleware/auth');

// Todas las rutas requieren autenticación de admin
router.use(auth);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Dashboard principal del admin
 * @access  Private (Admin)
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @route   POST /api/admin/register-complete
 * @desc    Registrar cliente completo con memorial
 * @access  Private (Admin)
 */
router.post('/register-complete', adminController.registerComplete);

/**
 * @route   GET /api/admin/search
 * @desc    Búsqueda global en el sistema
 * @access  Private (Admin)
 * @query   q (término de búsqueda)
 */
router.get('/search', adminController.globalSearch);

/**
 * @route   GET /api/admin/clients/:clientId/summary
 * @desc    Resumen completo de un cliente
 * @access  Private (Admin)
 */
router.get('/clients/:clientId/summary', adminController.getClientSummary);

/**
 * @route   POST /api/admin/clients/:clientId/quick-memorial
 * @desc    Crear memorial rápido para un cliente
 * @access  Private (Admin)
 */
router.post('/clients/:clientId/quick-memorial', adminController.createQuickMemorial);

/**
 * @route   GET /api/admin/metrics
 * @desc    Métricas y estadísticas del sistema
 * @access  Private (Admin)
 */
router.get('/metrics', adminController.getMetrics);

/**
 * @route   GET /api/admin/health
 * @desc    Estado del sistema
 * @access  Private (Admin)
 */
router.get('/health', adminController.health);

/**
 * @route   GET /api/admin/config
 * @desc    Configuración del sistema
 * @access  Private (Admin)
 */
router.get('/config', adminController.getConfig);

module.exports = router;
