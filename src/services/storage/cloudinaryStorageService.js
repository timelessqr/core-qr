// ====================================
// src/services/storage/cloudinaryStorageService.js
// ====================================
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

class CloudinaryStorageService {
  constructor() {
    // Configurar Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    console.log(`☁️ Cloudinary configurado: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  }

  /**
   * Subir archivo a Cloudinary
   */
  async uploadFile(file, destinationPath, options = {}) {
    try {
      // Determinar tipo de archivo
      const isVideo = file.mimetype?.startsWith('video/') || false;
      const isImage = file.mimetype?.startsWith('image/') || false;
      
      // Validar tipo de archivo
      if (!isVideo && !isImage) {
        throw new Error('Tipo de archivo no soportado');
      }

      // Validar tamaños
      if (isImage && file.size > process.env.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        throw new Error(`Imagen demasiado grande. Máximo ${process.env.MAX_IMAGE_SIZE_MB}MB`);
      }
      
      if (isVideo && file.size > process.env.MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        throw new Error(`Video demasiado grande. Máximo ${process.env.MAX_VIDEO_SIZE_MB}MB`);
      }

      // Extraer información del destino
      const pathParts = destinationPath.split('/');
      const fileName = pathParts.pop();
      const folder = pathParts.join('/');

      // Generar public_id único
      const uniqueId = uuidv4();
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const publicId = `${folder}/${fileNameWithoutExt}_${uniqueId}`;

      // Configurar opciones de upload
      const uploadOptions = {
        public_id: publicId,
        folder: folder,
        resource_type: isVideo ? 'video' : 'image',
        overwrite: false,
        ...options
      };

      // Optimizaciones específicas por tipo
      if (isImage) {
        uploadOptions.transformation = [
          {
            quality: 'auto:best',
            fetch_format: 'auto'
          }
        ];
      } else if (isVideo) {
        uploadOptions.transformation = [
          {
            quality: 'auto:best',
            video_codec: 'auto'
          }
        ];
      }

      // Upload del archivo
      let uploadResult;
      
      if (file.buffer) {
        // Si es buffer (multer en memoria)
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });
      } else if (file.path) {
        // Si es archivo temporal (multer en disco)
        uploadResult = await cloudinary.uploader.upload(file.path, uploadOptions);
      } else {
        throw new Error('Formato de archivo no soportado');
      }

      return {
        success: true,
        path: destinationPath,
        fullPath: uploadResult.secure_url,
        url: uploadResult.secure_url,
        fullUrl: uploadResult.secure_url,
        size: uploadResult.bytes,
        lastModified: new Date(),
        etag: uploadResult.etag || uploadResult.signature,
        cloudinaryData: {
          public_id: uploadResult.public_id,
          version: uploadResult.version,
          signature: uploadResult.signature,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          resource_type: uploadResult.resource_type,
          duration: uploadResult.duration // Para videos
        }
      };

    } catch (error) {
      console.error('Error subiendo a Cloudinary:', error);
      throw new Error(`Error subiendo archivo a Cloudinary: ${error.message}`);
    }
  }

  /**
   * Obtener URL de archivo
   */
  async getFileUrl(filePath) {
    try {
      // Si ya es una URL de Cloudinary, devolverla
      if (filePath.includes('cloudinary.com')) {
        return {
          url: filePath,
          fullUrl: filePath,
          expires: null
        };
      }

      // Si es un public_id, generar URL
      const url = cloudinary.url(filePath, {
        secure: true,
        quality: 'auto:best',
        fetch_format: 'auto'
      });

      return {
        url: url,
        fullUrl: url,
        expires: null
      };
    } catch (error) {
      throw new Error(`Error obteniendo URL de Cloudinary: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo de Cloudinary
   */
  async deleteFile(filePath) {
    try {
      let publicId;

      // Extraer public_id de la URL
      if (filePath.includes('cloudinary.com')) {
        const urlParts = filePath.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1) {
          publicId = urlParts.slice(uploadIndex + 2).join('/').split('.')[0];
        }
      } else {
        publicId = filePath;
      }

      if (!publicId) {
        throw new Error('No se pudo extraer public_id del archivo');
      }

      // Intentar eliminar como imagen primero
      let result;
      try {
        result = await cloudinary.uploader.destroy(publicId);
      } catch (imageError) {
        // Si falla como imagen, intentar como video
        result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }

      return {
        success: result.result === 'ok',
        path: filePath,
        message: result.result === 'ok' ? 'Archivo eliminado exitosamente' : 'Archivo no encontrado'
      };
    } catch (error) {
      console.error('Error eliminando de Cloudinary:', error);
      throw new Error(`Error eliminando archivo de Cloudinary: ${error.message}`);
    }
  }

  /**
   * Verificar si un archivo existe
   */
  async fileExists(filePath) {
    try {
      await this.getFileUrl(filePath);
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
      let publicId;

      // Extraer public_id de la URL
      if (filePath.includes('cloudinary.com')) {
        const urlParts = filePath.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1) {
          publicId = urlParts.slice(uploadIndex + 2).join('/').split('.')[0];
        }
      } else {
        publicId = filePath;
      }

      // Obtener información del recurso
      const result = await cloudinary.api.resource(publicId);

      return {
        path: filePath,
        size: result.bytes,
        lastModified: new Date(result.created_at),
        created: new Date(result.created_at),
        isDirectory: false,
        isFile: true,
        etag: result.etag,
        format: result.format,
        width: result.width,
        height: result.height,
        cloudinaryData: result
      };
    } catch (error) {
      throw new Error(`Error obteniendo info de archivo: ${error.message}`);
    }
  }

  /**
   * Copiar archivo (no aplicable en Cloudinary)
   */
  async copyFile(sourcePath, destinationPath) {
    throw new Error('Operación de copia no disponible en Cloudinary');
  }

  /**
   * Mover archivo (renombrar en Cloudinary)
   */
  async moveFile(sourcePath, destinationPath) {
    try {
      // Extraer public_id del source
      let sourcePublicId;
      if (sourcePath.includes('cloudinary.com')) {
        const urlParts = sourcePath.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1) {
          sourcePublicId = urlParts.slice(uploadIndex + 2).join('/').split('.')[0];
        }
      } else {
        sourcePublicId = sourcePath;
      }

      // Generar nuevo public_id
      const pathParts = destinationPath.split('/');
      const fileName = pathParts.pop();
      const folder = pathParts.join('/');
      const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const newPublicId = `${folder}/${fileNameWithoutExt}`;

      // Renombrar en Cloudinary
      const result = await cloudinary.uploader.rename(sourcePublicId, newPublicId);

      return {
        success: true,
        sourcePath,
        destinationPath,
        newUrl: result.secure_url,
        message: 'Archivo movido exitosamente'
      };
    } catch (error) {
      throw new Error(`Error moviendo archivo: ${error.message}`);
    }
  }

  /**
   * Listar archivos en directorio (limitado en Cloudinary)
   */
  async listFiles(directoryPath, options = {}) {
    try {
      const searchOptions = {
        type: 'upload',
        prefix: directoryPath,
        max_results: options.limit || 50
      };

      const result = await cloudinary.search
        .expression(`folder:${directoryPath}`)
        .sort_by([['created_at', 'desc']])
        .max_results(searchOptions.max_results)
        .execute();

      const files = result.resources.map(resource => ({
        name: resource.public_id.split('/').pop(),
        path: resource.public_id,
        isDirectory: false,
        isFile: true,
        size: resource.bytes,
        lastModified: new Date(resource.created_at),
        url: resource.secure_url,
        format: resource.format,
        width: resource.width,
        height: resource.height
      }));

      return {
        directory: directoryPath,
        files: files,
        total: files.length
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
      const usage = await cloudinary.api.usage();

      return {
        totalSize: usage.storage.usage,
        totalFiles: usage.resources,
        totalVideos: usage.videos || 0,
        totalImages: usage.resources - (usage.videos || 0),
        sizeFormatted: this.formatBytes(usage.storage.usage),
        provider: 'Cloudinary',
        plan: usage.plan,
        credits: usage.credits,
        limit: usage.storage.limit
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  /**
   * Generar URL con transformaciones
   */
  generateTransformedUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
  }

  /**
   * Generar thumbnails automáticamente
   */
  generateThumbnails(publicId) {
    return {
      thumbnail: this.generateTransformedUrl(publicId, { 
        width: 150, 
        height: 150, 
        crop: 'thumb',
        gravity: 'face'
      }),
      small: this.generateTransformedUrl(publicId, { 
        width: 400, 
        height: 400, 
        crop: 'limit'
      }),
      medium: this.generateTransformedUrl(publicId, { 
        width: 800, 
        height: 800, 
        crop: 'limit'
      }),
      large: this.generateTransformedUrl(publicId, { 
        width: 1200, 
        height: 1200, 
        crop: 'limit'
      })
    };
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
}

module.exports = new CloudinaryStorageService();
