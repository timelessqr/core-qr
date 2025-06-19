// ====================================
// src/services/storage/r2StorageService.js
// ====================================
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, 
         HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class R2StorageService {
  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID;
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL;
    
    // Validar configuración
    this.validateConfig();
    
    // Crear cliente S3 compatible con R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
    
    console.log('☁️  Cloudflare R2 configurado correctamente');
  }

  /**
   * Validar configuración requerida
   */
  validateConfig() {
    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Configuración de R2 incompleta. Faltan: ${missing.join(', ')}`);
    }
  }

  /**
   * Obtener Content-Type basado en la extensión del archivo
   */
  getContentType(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    
    const mimeTypes = {
      // Imágenes
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // Videos
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      
      // Documentos
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Otros
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Subir archivo a R2
   */
  async uploadFile(file, destinationPath, options = {}) {
    try {
      let fileBuffer;
      let fileSize;
      let originalName = destinationPath;
      
      // Procesar diferentes tipos de entrada
      if (Buffer.isBuffer(file)) {
        fileBuffer = file;
        fileSize = file.length;
      } else if (file.buffer) {
        fileBuffer = file.buffer;
        fileSize = file.buffer.length;
        originalName = file.originalname || destinationPath;
      } else if (file.path) {
        const fs = require('fs').promises;
        fileBuffer = await fs.readFile(file.path);
        fileSize = fileBuffer.length;
        originalName = file.originalname || file.name || destinationPath;
      } else {
        throw new Error('Formato de archivo no soportado para R2');
      }

      const contentType = options.contentType || this.getContentType(originalName);
      
      // Metadatos adicionales
      const metadata = {
        'original-name': originalName,
        'upload-date': new Date().toISOString(),
        'upload-source': 'lazos-de-vida-api',
        ...options.metadata
      };

      // Parámetros de upload
      const uploadParams = {
        Bucket: this.bucketName,
        Key: destinationPath,
        Body: fileBuffer,
        ContentType: contentType,
        ContentLength: fileSize,
        Metadata: metadata,
        
        // Configuraciones de cache y acceso
        CacheControl: options.cacheControl || 'public, max-age=31536000', // 1 año
        ...options.s3Params
      };

      // Ejecutar upload
      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3Client.send(command);

      // Construir respuesta
      const response = {
        success: true,
        path: destinationPath,
        bucket: this.bucketName,
        key: destinationPath,
        url: this.getPublicUrl(destinationPath),
        fullUrl: this.getPublicUrl(destinationPath),
        size: fileSize,
        contentType,
        etag: result.ETag,
        versionId: result.VersionId,
        metadata,
        uploadDate: new Date().toISOString()
      };

      console.log(`✅ Archivo subido a R2: ${destinationPath}`);
      return response;

    } catch (error) {
      console.error('❌ Error subiendo a R2:', error);
      throw new Error(`Error subiendo archivo a R2: ${error.message}`);
    }
  }

  /**
   * Obtener URL pública del archivo
   */
  getPublicUrl(filePath) {
    if (this.publicUrl) {
      return `${this.publicUrl}/${filePath}`;
    }
    return `https://${this.bucketName}.${this.accountId}.r2.dev/${filePath}`;
  }

  /**
   * Obtener URL de archivo (alias para getPublicUrl)
   */
  async getFileUrl(filePath) {
    try {
      // Verificar que el archivo existe
      await this.fileExists(filePath);
      
      return {
        url: this.getPublicUrl(filePath),
        fullUrl: this.getPublicUrl(filePath),
        expires: null // URLs públicas no expiran
      };
    } catch (error) {
      throw new Error(`Archivo no encontrado en R2: ${filePath}`);
    }
  }

  /**
   * Eliminar archivo de R2
   */
  async deleteFile(filePath) {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: filePath
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);

      console.log(`🗑️ Archivo eliminado de R2: ${filePath}`);
      
      return {
        success: true,
        path: filePath,
        message: 'Archivo eliminado exitosamente de R2'
      };

    } catch (error) {
      throw new Error(`Error eliminando archivo de R2: ${error.message}`);
    }
  }

  /**
   * Verificar si un archivo existe en R2
   */
  async fileExists(filePath) {
    try {
      const headParams = {
        Bucket: this.bucketName,
        Key: filePath
      };

      const command = new HeadObjectCommand(headParams);
      await this.s3Client.send(command);
      return true;

    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new Error(`Error verificando archivo en R2: ${error.message}`);
    }
  }

  /**
   * Obtener información de archivo en R2
   */
  async getFileInfo(filePath) {
    try {
      const headParams = {
        Bucket: this.bucketName,
        Key: filePath
      };

      const command = new HeadObjectCommand(headParams);
      const result = await this.s3Client.send(command);

      return {
        path: filePath,
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        versionId: result.VersionId,
        metadata: result.Metadata,
        cacheControl: result.CacheControl,
        url: this.getPublicUrl(filePath)
      };

    } catch (error) {
      throw new Error(`Error obteniendo info de archivo en R2: ${error.message}`);
    }
  }

  /**
   * Copiar archivo dentro de R2
   */
  async copyFile(sourcePath, destinationPath) {
    try {
      const copyParams = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourcePath}`,
        Key: destinationPath
      };

      const command = new CopyObjectCommand(copyParams);
      const result = await this.s3Client.send(command);

      return {
        success: true,
        sourcePath,
        destinationPath,
        etag: result.CopyObjectResult.ETag,
        url: this.getPublicUrl(destinationPath),
        fullUrl: this.getPublicUrl(destinationPath)
      };

    } catch (error) {
      throw new Error(`Error copiando archivo en R2: ${error.message}`);
    }
  }

  /**
   * Mover archivo (copiar + eliminar)
   */
  async moveFile(sourcePath, destinationPath) {
    try {
      // Copiar archivo
      const copyResult = await this.copyFile(sourcePath, destinationPath);
      
      // Eliminar archivo original
      await this.deleteFile(sourcePath);

      return {
        success: true,
        sourcePath,
        destinationPath,
        message: 'Archivo movido exitosamente en R2',
        url: copyResult.url
      };

    } catch (error) {
      throw new Error(`Error moviendo archivo en R2: ${error.message}`);
    }
  }

  /**
   * Listar archivos en R2
   */
  async listFiles(directoryPath = '', options = {}) {
    try {
      const listParams = {
        Bucket: this.bucketName,
        Prefix: directoryPath,
        MaxKeys: options.limit || 1000
      };

      if (options.continuationToken) {
        listParams.ContinuationToken = options.continuationToken;
      }

      const command = new ListObjectsV2Command(listParams);
      const result = await this.s3Client.send(command);

      const files = (result.Contents || []).map(item => ({
        name: item.Key.split('/').pop(),
        path: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag,
        url: this.getPublicUrl(item.Key),
        isFile: true,
        isDirectory: false
      }));

      // Filtrar por tipo de archivo si se especifica
      let filteredFiles = files;
      
      if (options.fileType) {
        filteredFiles = files.filter(file => {
          if (options.fileType === 'images') {
            return /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          }
          if (options.fileType === 'videos') {
            return /\.(mp4|avi|mov|wmv)$/i.test(file.name);
          }
          return true;
        });
      }

      return {
        directory: directoryPath,
        files: filteredFiles,
        total: filteredFiles.length,
        truncated: result.IsTruncated,
        continuationToken: result.NextContinuationToken
      };

    } catch (error) {
      throw new Error(`Error listando archivos en R2: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de uso del bucket
   */
  async getUsageStats() {
    try {
      // Listar todos los archivos para calcular estadísticas
      let totalSize = 0;
      let totalFiles = 0;
      let continuationToken = null;

      do {
        const result = await this.listFiles('', { 
          limit: 1000, 
          continuationToken 
        });
        
        totalFiles += result.files.length;
        totalSize += result.files.reduce((sum, file) => sum + (file.size || 0), 0);
        
        continuationToken = result.continuationToken;
      } while (continuationToken);

      return {
        totalSize,
        totalFiles,
        sizeFormatted: this.formatBytes(totalSize),
        provider: 'Cloudflare R2',
        bucket: this.bucketName,
        publicUrl: this.publicUrl
      };

    } catch (error) {
      throw new Error(`Error obteniendo estadísticas de R2: ${error.message}`);
    }
  }

  /**
   * Generar URL presignada para upload directo
   */
  async generatePresignedUrl(filePath, options = {}) {
    try {
      const {
        expiresIn = 3600, // 1 hora por defecto
        contentType,
        contentLength,
        metadata
      } = options;

      const putParams = {
        Bucket: this.bucketName,
        Key: filePath,
        ContentType: contentType || this.getContentType(filePath),
        ...(contentLength && { ContentLength: contentLength }),
        ...(metadata && { Metadata: metadata })
      };

      const command = new PutObjectCommand(putParams);
      const presignedUrl = await getSignedUrl(this.s3Client, command, { 
        expiresIn 
      });

      return {
        uploadUrl: presignedUrl,
        filePath,
        fileUrl: this.getPublicUrl(filePath),
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      };

    } catch (error) {
      throw new Error(`Error generando URL presignada: ${error.message}`);
    }
  }

  /**
   * Generar URL presignada para descarga
   */
  async generateDownloadUrl(filePath, options = {}) {
    try {
      const {
        expiresIn = 3600,
        responseContentDisposition,
        responseContentType
      } = options;

      const getParams = {
        Bucket: this.bucketName,
        Key: filePath,
        ...(responseContentDisposition && { ResponseContentDisposition: responseContentDisposition }),
        ...(responseContentType && { ResponseContentType: responseContentType })
      };

      const command = new GetObjectCommand(getParams);
      const presignedUrl = await getSignedUrl(this.s3Client, command, { 
        expiresIn 
      });

      return {
        downloadUrl: presignedUrl,
        filePath,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      };

    } catch (error) {
      throw new Error(`Error generando URL de descarga: ${error.message}`);
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
}

module.exports = new R2StorageService();