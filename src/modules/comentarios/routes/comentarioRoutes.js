// ====================================
// src/modules/comentarios/routes/comentarioRoutes.js
// ====================================
const express = require('express');
const comentarioController = require('../controllers/comentarioController');
const authMiddleware = require('../../../middleware/auth');

const router = express.Router();

// ===========================================
// RUTAS PÚBLICAS (sin autenticación)
// ===========================================

/**
 * Validar código de comentarios
 * POST /api/memorial/:qrCode/validar-codigo
 */
router.post('/memorial/:qrCode/validar-codigo', comentarioController.validarCodigo);

/**
 * Crear comentario (requiere token de validación)
 * POST /api/memorial/:qrCode/comentarios
 */
router.post('/memorial/:qrCode/comentarios', comentarioController.crearComentario);

/**
 * 🆕 Crear respuesta a un comentario (requiere token de validación y nivel 'cliente')
 * POST /api/memorial/:qrCode/comentarios/:comentarioId/responder
 */
router.post('/memorial/:qrCode/comentarios/:comentarioId/responder', comentarioController.crearRespuesta);

/**
 * 🆕 Dar like a un comentario (público)
 * POST /api/memorial/:qrCode/comentarios/:comentarioId/like
 */
router.post('/memorial/:qrCode/comentarios/:comentarioId/like', comentarioController.darLike);

/**
 * Obtener comentarios públicos
 * GET /api/memorial/:qrCode/comentarios
 */
router.get('/memorial/:qrCode/comentarios', comentarioController.getComentariosPublicos);

/**
 * Obtener configuración pública de comentarios
 * GET /api/memorial/:qrCode/comentarios/config
 */
router.get('/memorial/:qrCode/comentarios/config', comentarioController.getConfiguracionPublica);

// ===========================================
// RUTAS ADMIN (requieren autenticación)
// ===========================================

// Aplicar middleware de autenticación para rutas admin
router.use('/admin', authMiddleware);

/**
 * Configurar código de comentarios
 * PUT /api/admin/profiles/:profileId/codigo-comentarios
 */
router.put('/admin/profiles/:profileId/codigo-comentarios', comentarioController.configurarCodigoComentarios);

/**
 * Generar código automático
 * POST /api/admin/profiles/:profileId/generar-codigo
 */
router.post('/admin/profiles/:profileId/generar-codigo', comentarioController.generarCodigoAutomatico);

/**
 * Obtener comentarios para admin
 * GET /api/admin/profiles/:profileId/comentarios
 */
router.get('/admin/profiles/:profileId/comentarios', comentarioController.getComentariosAdmin);

/**
 * Eliminar comentario
 * DELETE /api/admin/comentarios/:comentarioId
 */
router.delete('/admin/comentarios/:comentarioId', comentarioController.eliminarComentario);

/**
 * Buscar comentarios
 * GET /api/admin/profiles/:profileId/comentarios/search
 */
router.get('/admin/profiles/:profileId/comentarios/search', comentarioController.buscarComentarios);

/**
 * Obtener estadísticas de comentarios
 * GET /api/admin/profiles/:profileId/comentarios/stats
 */
router.get('/admin/profiles/:profileId/comentarios/stats', comentarioController.getEstadisticasComentarios);

module.exports = router;