// ====================================
// src/modules/auth/routes/authRoutes.js
// ====================================
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../../../middleware/auth');
const { validate, schemas } = require('../../../utils/validators');

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/login', validate(schemas.login), authController.login);

// Rutas protegidas (requieren autenticación de admin)
router.use(authMiddleware);

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.get('/validate-token', authController.validateToken);

// Endpoint para que el admin cree otros admins (si es necesario en el futuro)
// router.post('/create-admin', authController.createAdmin);

module.exports = router;
