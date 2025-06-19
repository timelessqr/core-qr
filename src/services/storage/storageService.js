// ====================================
// src/services/storage/storageService.js
// ====================================
const localStorageService = require('./localStorageService');

class StorageService {
  constructor() {
    // Determinar qué servicio de storage usar basado en la configuración
    this.useR2 = this.shouldUseR2();
    
    // Solo importar R2StorageService si está configurado
    if (this.useR2) {
      const r2StorageService = require('./r2StorageService');
      this.storageProvider = r2StorageService;
    } else {
      this.storageProvider = localStorageService;
    }
    
    console.log(`📦 Storage configurado: ${this.useR2 ? 'Cloudflare R2' : 'Local'}`);
  }

  /**
   * Determinar si usar R2 basado en variables de entorno
   */
  shouldUseR2() {
    return !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
    );
  }

  /**
   * Subir archivo al storage
   */
  async uploadFile(file, destinationPath, options = {}) {
    try {
      return await this.storageProvider.uploadFile(file, destinationPath, options);
    } catch (error) {
      throw new Error(`Error subiendo archivo: ${error.message}`);
    }
  }

  /**
   * Subir múltiples archivos
   */
  async uploadFiles(files, destinationPaths, options = {}) {
    try {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const result = await this.uploadFile(files[i], destinationPaths[i], options);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw new Error(`Error subiendo archivos: ${error.message}`);
    }
  }

  /**
   * Obtener URL de archivo
   */
  async getFileUrl(filePath) {
    try {
      return await this.storageProvider.getFileUrl(filePath);
    } catch (error) {
      throw new Error(`Error obteniendo URL: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(filePath) {
    try {
      return await this.storageProvider.deleteFile(filePath);
    } catch (error) {
      throw new Error(`Error eliminando archivo: ${error.message}`);
    }
  }

  /**
   * Eliminar múltiples archivos
   */
  async deleteFiles(filePaths) {
    try {
      const results = [];
      
      for (const filePath of filePaths) {
        const result = await this.deleteFile(filePath);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw new Error(`Error eliminando archivos: ${error.message}`);
    }
  }

  /**
   * Verificar si un archivo existe
   */
  async fileExists(filePath) {
    try {
      return await this.storageProvider.fileExists(filePath);
    } catch (error) {
      throw new Error(`Error verificando archivo: ${error.message}`);
    }
  }

  /**
   * Obtener información de archivo
   */
  async getFileInfo(filePath) {
    try {
      return await this.storageProvider.getFileInfo(filePath);
    } catch (error) {
      throw new Error(`Error obteniendo info de archivo: ${error.message}`);
    }
  }

  /**
   * Copiar archivo
   */
  async copyFile(sourcePath, destinationPath) {
    try {
      return await this.storageProvider.copyFile(sourcePath, destinationPath);
    } catch (error) {
      throw new Error(`Error copiando archivo: ${error.message}`);
    }
  }

  /**
   * Mover archivo
   */
  async moveFile(sourcePath, destinationPath) {
    try {
      return await this.storageProvider.moveFile(sourcePath, destinationPath);
    } catch (error) {
      throw new Error(`Error moviendo archivo: ${error.message}`);
    }
  }

  /**
   * Listar archivos en directorio
   */
  async listFiles(directoryPath, options = {}) {
    try {
      return await this.storageProvider.listFiles(directoryPath, options);
    } catch (error) {
      throw new Error(`Error listando archivos: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de uso
   */
  async getUsageStats() {
    try {
      return await this.storageProvider.getUsageStats();
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Generar URL presignada para upload directo (solo R2)
   */
  async generatePresignedUrl(filePath, options = {}) {
    try {
      if (!this.useR2) {
        throw new Error('URLs presignadas solo disponibles con Cloudflare R2');
      }
      
      return await this.storageProvider.generatePresignedUrl(filePath, options);
    } catch (error) {
      throw new Error(`Error generando URL presignada: ${error.message}`);
    }
  }

  /**
   * Obtener información del proveedor
   */
  getProviderInfo() {
    return {
      provider: this.useR2 ? 'Cloudflare R2' : 'Local Storage',
      features: {
        presignedUrls: this.useR2,
        cdn: this.useR2,
        globalDistribution: this.useR2,
        autoBackup: this.useR2
      },
      config: this.useR2 ? {
        bucket: process.env.R2_BUCKET_NAME,
        publicUrl: process.env.R2_PUBLIC_URL
      } : {
        baseDir: process.cwd() + '/uploads'
      }
    };
  }
}

module.exports = new StorageService();