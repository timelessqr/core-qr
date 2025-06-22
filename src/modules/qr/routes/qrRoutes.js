// ====================================
// src/modules/qr/routes/qrRoutes.js
// ====================================
const express = require('express');
const qrController = require('../controllers/qrController');
const authMiddleware = require('../../../middleware/auth');

const router = express.Router();

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware);

// Obtener todos los QRs (para admin)
router.get('/', qrController.getAllQRs);

// Generar QR para un perfil
router.post('/generate/:profileId', qrController.generateForProfile);

// Obtener QRs del usuario
router.get('/my-qrs', qrController.getUserQRs);

// Obtener QR por código
router.get('/:code', qrController.getByCode);

// Obtener estadísticas de un QR
router.get('/:code/stats', qrController.getStats);

// Generar imagen QR
router.post('/:code/image', qrController.generateImage);

// Trackear visita (puede ser público en algunos casos)
router.post('/:code/visit', qrController.trackVisit);

module.exports = router;