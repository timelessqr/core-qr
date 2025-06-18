// ====================================
// src/modules/auth/routes/authRoutes.js
// ====================================
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../../../middleware/auth');
const { validate, schemas } = require('../../../utils/validators');

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware); // Todo lo de abajo requiere token

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/upgrade-plan', authController.upgradePlan);
router.post('/logout', authController.logout);
router.get('/validate-token', authController.validateToken);

module.exports = router;
