// ====================================
// src/services/storage/localStorageService.js
// ====================================
const fs = require('fs').promises;
const path = require('path');

class LocalStorageService {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Asegurar que el directorio base existe
    this.ensureBaseDirectory();
  }

  /**
   * Asegurar que el directorio base existe
   */
  async ensureBaseDirectory() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio base:', error);
    }
  }

  /**
   * Obtener ruta completa del archivo
   */
  getFullPath(filePath) {
    return path.join(this.baseDir, filePath);
  }

  /**
   * Asegurar que el directorio del archivo existe
   */
  async ensureDirectory(filePath) {
    const dir = path.dirname(this.getFullPath(filePath));
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Subir archivo
   */
  async uploadFile(file, destinationPath, options = {}) {
    try {
      await this.ensureDirectory(destinationPath);
      
      const fullPath = this.getFullPath(destinationPath);
      
      // Si el file es un buffer, escribirlo directamente
      if (Buffer.isBuffer(file)) {
        await fs.writeFile(fullPath, file);
      } 
      // Si el file tiene una ruta, copiarlo
      else if (typeof file === 'string') {
        const sourceStats = await fs.stat(file);
        await fs.copyFile(file, fullPath);
      }
      // Si es un objeto file con buffer
      else if (file.buffer) {
        await fs.writeFile(fullPath, file.buffer);
      }
      // Si es un objeto file con path
      else if (file.path) {
        await fs.copyFile(file.path, fullPath);
      }
      else {
        throw new Error('Formato de archivo no soportado');
      }

      // Obtener información del archivo
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        path: destinationPath,
        fullPath,
        url: `/uploads/${destinationPath}`,
        fullUrl: `${this.baseUrl}/uploads/${destinationPath}`,
        size: stats.size,
        lastModified: stats.mtime,
        etag: this.generateEtag(stats)
      };

    } catch (error) {
      throw new Error(`Error subiendo archivo local: ${error.message}`);
    }
  }

  /**
   * Obtener URL de archivo
   */
  async getFileUrl(filePath) {
    try {
      const fullPath = this.getFullPath(filePath);
      
      // Verificar que el archivo existe
      await fs.access(fullPath);
      
      return {
        url: `/uploads/${filePath}`,
        fullUrl: `${this.baseUrl}/uploads/${filePath}`,
        expires: null // Local files don't expire
      };
    } catch (error) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(filePath) {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.unlink(fullPath);
      
      return {
        success: true,
        path: filePath,
        message: 'Archivo eliminado exitosamente'
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          success: true,
          path: filePath,
          message: 'Archivo ya no existe'
        };
      }
      throw new Error(`Error eliminando archivo: ${error.message}`);
    }
  }

  /**
   * Verificar si un archivo existe
   */
  async fileExists(filePath) {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener información de archivo
   */
  async getFileInfo(filePath) {
    try {
      const fullPath = this.getFullPath(filePath);
      const stats = await fs.stat(fullPath);
      
      return {
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        etag: this.generateEtag(stats)
      };
    } catch (error) {
      throw new Error(`Error obteniendo info de archivo: ${error.message}`);
    }
  }

  /**
   * Copiar archivo
   */
  async copyFile(sourcePath, destinationPath) {
    try {
      await this.ensureDirectory(destinationPath);
      
      const sourceFullPath = this.getFullPath(sourcePath);
      const destFullPath = this.getFullPath(destinationPath);
      
      await fs.copyFile(sourceFullPath, destFullPath);
      
      const stats = await fs.stat(destFullPath);
      
      return {
        success: true,
        sourcePath,
        destinationPath,
        size: stats.size,
        url: `/uploads/${destinationPath}`,
        fullUrl: `${this.baseUrl}/uploads/${destinationPath}`
      };
    } catch (error) {
      throw new Error(`Error copiando archivo: ${error.message}`);
    }
  }

  /**
   * Mover archivo
   */
  async moveFile(sourcePath, destinationPath) {
    try {
      await this.copyFile(sourcePath, destinationPath);
      await this.deleteFile(sourcePath);
      
      return {
        success: true,
        sourcePath,
        destinationPath,
        message: 'Archivo movido exitosamente'
      };
    } catch (error) {
      throw new Error(`Error moviendo archivo: ${error.message}`);
    }
  }

  /**
   * Listar archivos en directorio
   */
  async listFiles(directoryPath, options = {}) {
    try {
      const fullPath = this.getFullPath(directoryPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      const files = [];
      
      for (const item of items) {
        const itemPath = path.join(directoryPath, item.name);
        const stats = await fs.stat(this.getFullPath(itemPath));
        
        files.push({
          name: item.name,
          path: itemPath,
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
          size: stats.size,
          lastModified: stats.mtime,
          url: item.isFile() ? `/uploads/${itemPath}` : null
        });
      }
      
      // Aplicar filtros si se especifican
      let filteredFiles = files;
      
      if (options.fileType) {
        filteredFiles = files.filter(file => {
          if (options.fileType === 'images') {
            return file.isFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          }
          if (options.fileType === 'videos') {
            return file.isFile && /\.(mp4|avi|mov|wmv)$/i.test(file.name);
          }
          return true;
        });
      }
      
      if (options.limit) {
        filteredFiles = filteredFiles.slice(0, options.limit);
      }
      
      return {
        directory: directoryPath,
        files: filteredFiles,
        total: filteredFiles.length
      };
    } catch (error) {
      throw new Error(`Error listando archivos: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de uso
   */
  async getUsageStats() {
    try {
      const stats = await this.calculateDirectorySize(this.baseDir);
      
      return {
        totalSize: stats.size,
        totalFiles: stats.files,
        totalDirectories: stats.directories,
        sizeFormatted: this.formatBytes(stats.size),
        provider: 'Local Storage',
        basePath: this.baseDir
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Calcular tamaño de directorio recursivamente
   */
  async calculateDirectorySize(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      let totalSize = 0;
      let totalFiles = 0;
      let totalDirectories = 0;
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          totalDirectories++;
          const subStats = await this.calculateDirectorySize(itemPath);
          totalSize += subStats.size;
          totalFiles += subStats.files;
          totalDirectories += subStats.directories;
        } else {
          totalFiles++;
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
        }
      }
      
      return {
        size: totalSize,
        files: totalFiles,
        directories: totalDirectories
      };
    } catch (error) {
      return { size: 0, files: 0, directories: 0 };
    }
  }

  /**
   * Formatear bytes en formato legible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generar ETag simple basado en stats
   */
  generateEtag(stats) {
    return `"${stats.size}-${stats.mtime.getTime()}"`;
  }
}

module.exports = new LocalStorageService();