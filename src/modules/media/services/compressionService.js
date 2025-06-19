// ====================================
// src/modules/media/services/compressionService.js
// ====================================
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs').promises;
const { FILE_LIMITS } = require('../../../utils/constants');

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

class CompressionService {
  /**
   * Comprimir imagen usando Sharp
   */
  async compressImage(inputPath, outputPath, options = {}) {
    try {
      const {
        quality = 85,
        width = null,
        height = null,
        format = 'jpeg'
      } = options;

      let pipeline = sharp(inputPath);

      // Redimensionar si se especifica
      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Aplicar compresión según formato
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({ 
            quality, 
            progressive: true,
            mozjpeg: true 
          });
          break;
        case 'png':
          pipeline = pipeline.png({ 
            quality, 
            compressionLevel: 9 
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({ 
            quality,
            effort: 6 
          });
          break;
        default:
          throw new Error(`Formato no soportado: ${format}`);
      }

      // Procesar y guardar
      await pipeline.toFile(outputPath);

      // Obtener información del archivo comprimido
      const stats = await fs.stat(outputPath);
      const metadata = await sharp(outputPath).metadata();

      return {
        path: outputPath,
        size: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };

    } catch (error) {
      throw new Error(`Error comprimiendo imagen: ${error.message}`);
    }
  }

  /**
   * Crear múltiples versiones de una imagen
   */
  async createImageVersions(inputPath, outputDir, baseFilename) {
    try {
      const versions = {
        thumbnail: { width: 200, height: 200, quality: 80 },
        medium: { width: 800, height: 600, quality: 85 },
        large: { width: 1920, height: 1080, quality: 90 }
      };

      const results = {};

      for (const [versionName, options] of Object.entries(versions)) {
        const outputPath = path.join(outputDir, `${baseFilename}_${versionName}.jpg`);
        
        const result = await this.compressImage(inputPath, outputPath, {
          ...options,
          format: 'jpeg'
        });

        results[versionName] = result;
      }

      return results;
    } catch (error) {
      throw new Error(`Error creando versiones de imagen: ${error.message}`);
    }
  }

  /**
   * Comprimir video usando FFmpeg
   */
  async compressVideo(inputPath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const {
          quality = '720p',
          videoBitrate = '1000k',
          audioBitrate = '128k',
          format = 'mp4'
        } = options;

        let command = ffmpeg(inputPath);

        // Configurar codec de video
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .format(format);

        // Configurar calidad según el preset
        switch (quality) {
          case '480p':
            command = command
              .size('854x480')
              .videoBitrate('800k')
              .audioBitrate('96k');
            break;
          case '720p':
            command = command
              .size('1280x720')
              .videoBitrate('1500k')
              .audioBitrate('128k');
            break;
          case '1080p':
            command = command
              .size('1920x1080')
              .videoBitrate('3000k')
              .audioBitrate('192k');
            break;
          default:
            command = command
              .videoBitrate(videoBitrate)
              .audioBitrate(audioBitrate);
        }

        // Opciones adicionales para optimización
        command = command
          .addOptions([
            '-preset fast',
            '-crf 23',
            '-movflags +faststart' // Para streaming
          ]);

        // Ejecutar compresión
        command
          .on('start', (commandLine) => {
            console.log('FFmpeg iniciado:', commandLine);
          })
          .on('progress', (progress) => {
            console.log(`Progreso: ${progress.percent}%`);
          })
          .on('end', async () => {
            try {
              // Obtener información del archivo comprimido
              const stats = await fs.stat(outputPath);
              
              // Obtener metadata del video
              ffmpeg.ffprobe(outputPath, (err, metadata) => {
                if (err) {
                  reject(new Error(`Error obteniendo metadata: ${err.message}`));
                  return;
                }

                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                
                resolve({
                  path: outputPath,
                  size: stats.size,
                  duration: metadata.format.duration,
                  width: videoStream?.width,
                  height: videoStream?.height,
                  bitrate: metadata.format.bit_rate
                });
              });
            } catch (error) {
              reject(new Error(`Error obteniendo stats del video: ${error.message}`));
            }
          })
          .on('error', (err) => {
            reject(new Error(`Error comprimiendo video: ${err.message}`));
          })
          .save(outputPath);

      } catch (error) {
        reject(new Error(`Error configurando compresión de video: ${error.message}`));
      }
    });
  }

  /**
   * Crear thumbnail de video
   */
  async createVideoThumbnail(inputPath, outputPath, timePosition = '00:00:01') {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timePosition],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x240'
        })
        .on('end', async () => {
          try {
            // Comprimir el thumbnail
            const compressedPath = outputPath.replace('.png', '_compressed.jpg');
            
            const result = await this.compressImage(outputPath, compressedPath, {
              quality: 80,
              format: 'jpeg'
            });

            // Eliminar el PNG original
            await fs.unlink(outputPath);

            resolve({
              ...result,
              path: compressedPath
            });
          } catch (error) {
            reject(new Error(`Error procesando thumbnail: ${error.message}`));
          }
        })
        .on('error', (err) => {
          reject(new Error(`Error creando thumbnail: ${err.message}`));
        });
    });
  }

  /**
   * Optimizar archivo según su tipo
   */
  async optimizeFile(inputPath, outputDir, filename, fileType) {
    try {
      const baseFilename = path.parse(filename).name;
      
      if (fileType === 'foto') {
        // Para fotos, crear versiones optimizadas
        const versions = await this.createImageVersions(inputPath, outputDir, baseFilename);
        
        return {
          type: 'foto',
          versions,
          mainVersion: versions.large // La versión principal será la large
        };
        
      } else if (fileType === 'video') {
        // Para videos, comprimir y crear thumbnail
        const outputPath = path.join(outputDir, `${baseFilename}_compressed.mp4`);
        const thumbnailPath = path.join(outputDir, `${baseFilename}_thumb.jpg`);
        
        const [videoResult, thumbnailResult] = await Promise.all([
          this.compressVideo(inputPath, outputPath, { quality: '720p' }),
          this.createVideoThumbnail(inputPath, thumbnailPath)
        ]);

        return {
          type: 'video',
          video: videoResult,
          thumbnail: thumbnailResult
        };
      }

      throw new Error(`Tipo de archivo no soportado: ${fileType}`);
      
    } catch (error) {
      throw new Error(`Error optimizando archivo: ${error.message}`);
    }
  }

  /**
   * Calcular factor de compresión
   */
  calculateCompressionRatio(originalSize, compressedSize) {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
  }

  /**
   * Validar si un archivo necesita compresión
   */
  needsCompression(fileSize, fileType) {
    const limits = {
      foto: FILE_LIMITS.FOTO_MAX_SIZE * 0.7, // Comprimir si es > 70% del límite
      video: FILE_LIMITS.VIDEO_MAX_SIZE * 0.5 // Comprimir si es > 50% del límite
    };

    return fileSize > (limits[fileType] || 0);
  }
}

module.exports = new CompressionService();