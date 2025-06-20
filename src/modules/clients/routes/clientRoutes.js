// ====================================
// src/modules/clients/routes/clientRoutes.js
// ====================================
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../../../middleware/auth');

// Todas las rutas requieren autenticación de admin
router.use(auth);

/**
 * @route   POST /api/clients
 * @desc    Registrar nuevo cliente
 * @access  Private (Admin)
 */
router.post('/', clientController.register);

/**
 * @route   GET /api/clients
 * @desc    Obtener todos los clientes con paginación y filtros
 * @access  Private (Admin)
 * @query   page, limit, search, sortBy, sortOrder
 */
router.get('/', clientController.getAll);

/**
 * @route   GET /api/clients/stats
 * @desc    Obtener estadísticas de clientes
 * @access  Private (Admin)
 */
router.get('/stats', clientController.getStats);

/**
 * @route   GET /api/clients/search
 * @desc    Buscar clientes
 * @access  Private (Admin)
 * @query   q (término de búsqueda), limit
 */
router.get('/search', clientController.search);

/**
 * @route   GET /api/clients/code/:codigo
 * @desc    Obtener cliente por código
 * @access  Private (Admin)
 */
router.get('/code/:codigo', clientController.getByCode);

/**
 * @route   GET /api/clients/:id
 * @desc    Obtener cliente por ID
 * @access  Private (Admin)
 */
router.get('/:id', clientController.getById);

/**
 * @route   GET /api/clients/:id/basic
 * @desc    Obtener información básica del cliente
 * @access  Private (Admin)
 */
router.get('/:id/basic', clientController.getBasicInfo);

/**
 * @route   PUT /api/clients/:id
 * @desc    Actualizar cliente
 * @access  Private (Admin)
 */
router.put('/:id', clientController.update);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Eliminar cliente (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', clientController.delete);

module.exports = router;
