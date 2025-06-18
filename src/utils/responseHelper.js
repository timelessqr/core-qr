class ResponseHelper {
  /**
   * Respuesta exitosa estándar
   */
  success(res, data = null, message = 'Operación exitosa', status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Respuesta de error estándar
   */
  error(res, message = 'Error interno', status = 500, errors = null) {
    return res.status(status).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Respuesta paginada
   */
  paginated(res, data, page, limit, total, message = 'Datos obtenidos') {
    const totalPages = Math.ceil(total / limit);
    
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Respuesta de validación
   */
  validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Respuesta no autorizada
   */
  unauthorized(res, message = 'No autorizado') {
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Respuesta no encontrado
   */
  notFound(res, message = 'Recurso no encontrado') {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Respuesta conflicto (409)
   */
  conflict(res, message = 'Conflicto en la operación') {
    return res.status(409).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { responseHelper: new ResponseHelper() };
