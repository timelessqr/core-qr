// ====================================
// src/middleware/auth.js
// ====================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { responseHelper } = require('../utils/responseHelper');
const { SECURITY, MESSAGES } = require('../utils/constants');

const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return responseHelper.unauthorized(res, MESSAGES.ERROR.UNAUTHORIZED);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token
    const decoded = jwt.verify(token, SECURITY.JWT_SECRET);
    
    // Buscar usuario
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return responseHelper.unauthorized(res, MESSAGES.ERROR.UNAUTHORIZED);
    }
    
    // Agregar usuario al request
    req.user = {
      id: user._id,
      email: user.email,
      plan: user.plan,
      nombre: user.nombre
    };
    
    next();
  } catch (error) {
    console.error('Error en middleware auth:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return responseHelper.unauthorized(res, 'Token inválido');
    }
    
    if (error.name === 'TokenExpiredError') {
      return responseHelper.unauthorized(res, 'Token expirado');
    }
    
    responseHelper.unauthorized(res, MESSAGES.ERROR.UNAUTHORIZED);
  }
};

module.exports = authMiddleware;