// ====================================
// src/modules/media/routes/mediaRoutes.js
// ====================================
const express = require('express');
const multer = require('multer');
const path = require('path');
const mediaController = require('../controllers/mediaController');
// const storageController = require('../controllers/storageController'); // DISABLED - Not using storage routes
const auth = require('../../../middleware/auth');
const { FILE_LIMITS, FORMATOS_PERMITIDOS } = require('../../../utils/constants');

const router = express.Router();

// ===============================
// CONFIGURACIÓN DE MULTER
// ===============================

// Configuración de storage (memoria para procesamiento)
const storage = multer.memoryStorage();

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  // Verificar si es imagen
  if (file.mimetype.startsWith('image/')) {
    if (FORMATOS_PERMITIDOS.fotos.includes(ext)) {
      return cb(null, true);
    }
  }
  
  // Verificar si es video
  if (file.mimetype.startsWith('video/')) {
    if (FORMATOS_PERMITIDOS.videos.includes(ext)) {
      return cb(null, true);
    }
  }
  
  // Verificar si es audio
  if (file.mimetype.startsWith('audio/')) {
    if (FORMATOS_PERMITIDOS.audio.includes(ext)) {
      return cb(null, true);
    }
  }
  
  cb(new Error(`Formato de archivo no permitido: ${ext}`), false);
};

// Configuración de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_LIMITS.VIDEO_MAX_SIZE, // Límite más alto (videos)
    files: 10 // Máximo 10 archivos por request
  }
});

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

// Middleware para validar parámetros de media
const validateMediaId = (req, res, next) => {
  const { mediaId } = req.params;
  
  if (!mediaId || !mediaId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'ID de media inválido'
    });
  }
  
  next();
};

// Middleware para manejar errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `Archivo demasiado grande. Máximo: ${Math.round(FILE_LIMITS.VIDEO_MAX_SIZE / (1024 * 1024))}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Demasiados archivos. Máximo: 10 archivos por vez'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Campo de archivo inesperado'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Error de upload: ${error.message}`
        });
    }
  }
  
  if (error.message.includes('Formato de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// ===============================
// RUTAS DE STORAGE - DISABLED
// ===============================
// Storage routes disabled - using R2 directly in mediaController

/*
// Storage routes commented out - not using storageController

router.get('/storage/info', auth, storageController.getProviderInfo);
router.get('/storage/stats', auth, storageController.getUsageStats);
router.post('/storage/presigned-url', auth, storageController.generatePresignedUrl);
router.get('/storage/list', auth, storageController.listUserFiles);
router.get('/storage/exists/:filePath(*)', auth, storageController.checkFileExists);
router.get('/storage/file-info/:filePath(*)', auth, storageController.getFileInfo);
router.get('/storage/download-url/:filePath(*)', auth, storageController.getDownloadUrl);
router.post('/storage/migrate-to-r2', auth, storageController.migrateToR2);

*/

// ===============================
// RUTAS PRINCIPALES
// ===============================

/**
 * @route   POST /api/media/upload/:profileId
 * @desc    Subir archivos de media a un perfil
 * @access  Private
 * @body    { seccion, titulo?, descripcion?, orden?, tags? }
 * @files   files[] (multipart/form-data)
 */
router.post('/upload/:profileId', 
  auth,
  validateProfileId,
  upload.array('files', 10),
  handleMulterError,
  mediaController.uploadFiles
);

/**
 * @route   GET /api/media/profile/:profileId
 * @desc    Obtener todos los media de un perfil
 * @access  Private
 * @query   { tipo?, seccion?, estado? }
 */
router.get('/profile/:profileId',
  auth,
  validateProfileId,
  mediaController.getByProfile
);

/**
 * @route   GET /api/media/public/:profileId
 * @desc    Obtener media público para memorial
 * @access  Public
 * @query   { seccion? }
 */
router.get('/public/:profileId',
  validateProfileId,
  mediaController.getPublicMedia
);

/**
 * @route   GET /api/media/stats/:profileId
 * @desc    Obtener estadísticas de media de un perfil
 * @access  Private
 */
router.get('/stats/:profileId',
  auth,
  validateProfileId,
  mediaController.getProfileStats
);

/**
 * @route   PUT /api/media/reorder/:profileId
 * @desc    Reordenar media en una sección
 * @access  Private
 * @body    { seccion, mediaIds[], orders[] }
 */
router.put('/reorder/:profileId',
  auth,
  validateProfileId,
  mediaController.reorderMedia
);

/**
 * @route   GET /api/media/my-media
 * @desc    Obtener todos los media del usuario autenticado
 * @access  Private
 * @query   { tipo?, estado? }
 */
router.get('/my-media',
  auth,
  mediaController.getUserMedia
);

/**
 * @route   GET /api/media/processing-status
 * @desc    Obtener estado de archivos en procesamiento
 * @access  Private
 */
router.get('/processing-status',
  auth,
  mediaController.getProcessingStatus
);

/**
 * @route   GET /api/media/:mediaId
 * @desc    Obtener un media específico
 * @access  Private
 */
router.get('/:mediaId',
  auth,
  validateMediaId,
  mediaController.getById
);

/**
 * @route   PUT /api/media/:mediaId
 * @desc    Actualizar información de un media
 * @access  Private
 * @body    { titulo?, descripcion?, orden?, tags?, seccion? }
 */
router.put('/:mediaId',
  auth,
  validateMediaId,
  mediaController.updateMedia
);

/**
 * @route   DELETE /api/media/:mediaId
 * @desc    Eliminar un media
 * @access  Private
 */
router.delete('/:mediaId',
  auth,
  validateMediaId,
  mediaController.deleteMedia
);

// ===============================
// RUTAS ESPECÍFICAS PARA FRONTEND
// ===============================

/**
 * @route   GET /api/media/backgrounds/:profileId
 * @desc    Obtener fondos del memorial
 * @access  Private
 */
router.get('/backgrounds/:profileId',
  auth,
  validateProfileId,
  mediaController.getBackgrounds
);

/**
 * @route   GET /api/media/music/:profileId
 * @desc    Obtener música del memorial
 * @access  Private
 */
router.get('/music/:profileId',
  auth,
  validateProfileId,
  mediaController.getMusic
);

/**
 * @route   PUT /api/media/slideshow-config/:profileId
 * @desc    Actualizar configuración de slideshow
 * @access  Private
 * @body    { autoplay?, interval?, transition? }
 */
router.put('/slideshow-config/:profileId',
  auth,
  validateProfileId,
  mediaController.updateSlideshowConfig
);

/**
 * @route   GET /api/media/slideshow-config/:profileId
 * @desc    Obtener configuración de slideshow
 * @access  Private
 */
router.get('/slideshow-config/:profileId',
  auth,
  validateProfileId,
  mediaController.getSlideshowConfig
);

// ===============================
// MIDDLEWARE DE MANEJO DE ERRORES
// ===============================

// Manejo de errores generales
router.use((error, req, res, next) => {
  console.error('Error en rutas de media:', error);
  
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