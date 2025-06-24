const express = require('express');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../../../middleware/auth');
const { validate, schemas } = require('../../../utils/validators');

const router = express.Router();

// Todas las rutas requieren autenticación de admin
router.use(authMiddleware);

/**
 * @route   POST /api/profiles
 * @desc    Crear nuevo perfil/memorial para un cliente
 * @access  Private (Admin)
 * @body    { clientId, nombre, fechaNacimiento, fechaFallecimiento, ... }
 */
router.post('/', validate(schemas.profile), profileController.create);

/**
 * @route   POST /api/profiles/basic
 * @desc    Crear perfil/memorial con datos básicos
 * @access  Private (Admin)
 * @body    { clientId, nombre, fechaNacimiento, fechaFallecimiento }
 */
router.post('/basic', profileController.createBasic);

/**
 * @route   GET /api/profiles
 * @desc    Obtener todos los perfiles (admin)
 * @access  Private (Admin)
 * @query   page, limit, search, sortBy, sortOrder
 */
router.get('/', profileController.getAll);

/**
 * @route   GET /api/profiles/client/:clientId
 * @desc    Obtener perfiles de un cliente específico
 * @access  Private (Admin)
 */
router.get('/client/:clientId', profileController.getClientProfiles);

/**
 * @route   GET /api/profiles/:id
 * @desc    Obtener perfil específico por ID
 * @access  Private (Admin)
 */
router.get('/:id', profileController.getById);

/**
 * @route   GET /api/profiles/:profileId/public
 * @desc    Obtener memorial público (para preview)
 * @access  Public
 */
router.get('/:profileId/public', profileController.getPublicMemorial);

/**
 * @route   PUT /api/profiles/:id
 * @desc    Actualizar perfil/memorial
 * @access  Private (Admin)
 */
router.put('/:id', validate(schemas.profileUpdate), profileController.update);

/**
 * @route   PUT /api/profiles/:id/memorial
 * @desc    Actualizar datos específicos del memorial (como fotoJoven)
 * @access  Private (Admin)
 */
router.put('/:id/memorial', profileController.updateMemorial);

/**
 * @route   DELETE /api/profiles/:id
 * @desc    Eliminar perfil/memorial (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', profileController.delete);

module.exports = router;
