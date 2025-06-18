const Joi = require('joi');
const { FORMATOS_PERMITIDOS, FILE_LIMITS } = require('./constants');

const schemas = {
  // Validación de registro de usuario
  register: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Debe ser un email válido',
        'any.required': 'El email es requerido'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'any.required': 'La contraseña es requerida'
      }),
    telefono: Joi.string()
      .max(20)
      .trim()
      .optional()
      .allow('')
  }),
  
  // Validación de login
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'El email es requerido'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'La contraseña es requerida'
      })
  }),
  
  // Validación de perfil de fallecido
  profile: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    fechaNacimiento: Joi.date()
      .max('now')
      .required()
      .messages({
        'date.max': 'La fecha de nacimiento no puede ser futura',
        'any.required': 'La fecha de nacimiento es requerida'
      }),
    fechaFallecimiento: Joi.date()
      .max('now')
      .min(Joi.ref('fechaNacimiento'))
      .required()
      .messages({
        'date.max': 'La fecha de fallecimiento no puede ser futura',
        'date.min': 'La fecha de fallecimiento debe ser posterior al nacimiento',
        'any.required': 'La fecha de fallecimiento es requerida'
      }),
    frase: Joi.string()
      .max(200)
      .trim()
      .optional()
      .allow(''),
    ubicacion: Joi.object({
      ciudad: Joi.string().max(50).trim().optional().allow(''),
      pais: Joi.string().max(50).trim().optional().allow(''),
      cementerio: Joi.string().max(100).trim().optional().allow('')
    }).optional(),
    biografia: Joi.string()
      .max(10000) // Se validará según plan en el servicio
      .trim()
      .optional()
      .allow(''),
    profesion: Joi.string()
      .max(100)
      .trim()
      .optional()
      .allow(''),
    familia: Joi.object({
      conyuge: Joi.string().max(100).trim().optional().allow(''),
      hijos: Joi.array().items(Joi.string().max(100).trim()).optional(),
      padres: Joi.array().items(Joi.string().max(100).trim()).optional(),
      hermanos: Joi.array().items(Joi.string().max(100).trim()).optional()
    }).optional()
  }),
  
  // Validación de actualización de perfil
  profileUpdate: Joi.object({
    nombre: Joi.string().min(2).max(100).trim().optional(),
    fechaNacimiento: Joi.date().max('now').optional(),
    fechaFallecimiento: Joi.date().max('now').optional(),
    frase: Joi.string().max(200).trim().optional().allow(''),
    ubicacion: Joi.object({
      ciudad: Joi.string().max(50).trim().optional().allow(''),
      pais: Joi.string().max(50).trim().optional().allow(''),
      cementerio: Joi.string().max(100).trim().optional().allow('')
    }).optional(),
    biografia: Joi.string().max(10000).trim().optional().allow(''),
    profesion: Joi.string().max(100).trim().optional().allow(''),
    familia: Joi.object({
      conyuge: Joi.string().max(100).trim().optional().allow(''),
      hijos: Joi.array().items(Joi.string().max(100).trim()).optional(),
      padres: Joi.array().items(Joi.string().max(100).trim()).optional(),
      hermanos: Joi.array().items(Joi.string().max(100).trim()).optional()
    }).optional()
  }),
  // Validación de actualización de perfil
  profileUpdate: Joi.object({
    nombre: Joi.string().min(2).max(100).trim().optional(),
    fechaNacimiento: Joi.date().max('now').optional(),
    fechaFallecimiento: Joi.date().max('now').optional(),
    frase: Joi.string().max(200).trim().optional().allow(''),
    ubicacion: Joi.object({
      ciudad: Joi.string().max(50).trim().optional().allow(''),
      pais: Joi.string().max(50).trim().optional().allow(''),
      cementerio: Joi.string().max(100).trim().optional().allow('')
    }).optional(),
    biografia: Joi.string().max(10000).trim().optional().allow(''),
    profesion: Joi.string().max(100).trim().optional().allow(''),
    familia: Joi.object({
      conyuge: Joi.string().max(100).trim().optional().allow(''),
      hijos: Joi.array().items(Joi.string().max(100).trim()).optional(),
      padres: Joi.array().items(Joi.string().max(100).trim()).optional(),
      hermanos: Joi.array().items(Joi.string().max(100).trim()).optional()
    }).optional(),
    isPublic: Joi.boolean().optional()
  }),
  
  // Validación de media upload
  mediaUpload: Joi.object({
    titulo: Joi.string().max(100).trim().optional().allow(''),
    descripcion: Joi.string().max(500).trim().optional().allow(''),
    seccion: Joi.string()
      .valid('galeria_fotos', 'videos_memoriales', 'cronologia', 'testimonios', 'logros', 'hobbies')
      .required(),
    tags: Joi.array().items(Joi.string().max(30).trim()).optional()
  })
};

/**
 * Middleware de validación
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Retorna todos los errores
      stripUnknown: true // Remueve campos no definidos
    });
    
    if (error) {
      const { responseHelper } = require('./responseHelper');
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return responseHelper.validationError(res, errors);
    }
    
    next();
  };
};

/**
 * Validador de archivos
 */
const validateFile = (tipo) => {
  return (req, res, next) => {
    if (!req.file) {
      const { responseHelper } = require('./responseHelper');
      return responseHelper.error(res, 'No se proporcionó archivo', 400);
    }
    
    const file = req.file;
    const { responseHelper } = require('./responseHelper');
    
    // Validar tipo de archivo
    const extension = file.originalname.split('.').pop().toLowerCase();
    const formatosPermitidos = FORMATOS_PERMITIDOS[tipo] || [];
    
    if (!formatosPermitidos.includes(extension)) {
      return responseHelper.error(
        res,
        `Formato no permitido. Use: ${formatosPermitidos.join(', ')}`,
        400
      );
    }
    
    // Validar tamaño
    const maxSize = tipo === 'fotos' ? FILE_LIMITS.FOTO_MAX_SIZE : FILE_LIMITS.VIDEO_MAX_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
      return responseHelper.error(
        res,
        `Archivo demasiado grande. Máximo: ${maxSizeMB}MB`,
        400
      );
    }
    
    next();
  };
};

module.exports = { 
  schemas, 
  validate,
  validateFile
};