// ====================================
// src/services/storage/storageService.js - DEPRECATED
// ====================================
// NOTA: Este archivo ha sido reemplazado por uso directo de Cloudinary
// en mediaService.js. Se mantiene por compatibilidad pero no se usa.
//
// Cloudinary se usa directamente en:
// - src/modules/media/services/mediaService.js
//
// ====================================

/*
const localStorageService = require('./localStorageService');

class StorageService {
  constructor() {
    console.log('⚠️ DEPRECATED: StorageService no se usa. Cloudinary directo en mediaService');
  }
}

module.exports = new StorageService();
*/

// Exportar un objeto vacío para evitar errores si algo lo importa
module.exports = {
  deprecated: true,
  message: 'StorageService ha sido reemplazado por uso directo de Cloudinary'
};