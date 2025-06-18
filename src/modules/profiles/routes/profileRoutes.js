const express = require('express');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../../../middleware/auth');
const { validate, schemas } = require('../../../utils/validators');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear nuevo perfil/memorial
router.post('/', validate(schemas.profile), profileController.create);

// Obtener perfiles del usuario
router.get('/my-profiles', profileController.getUserProfiles);

// Obtener perfil específico
router.get('/:id', profileController.getById);

// Actualizar perfil
router.put('/:id', validate(schemas.profileUpdate), profileController.update);

// Eliminar perfil
router.delete('/:id', profileController.delete);

module.exports = router;