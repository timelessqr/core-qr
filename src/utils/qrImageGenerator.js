const QRCode = require('qrcode');
const sharp = require('sharp');
const { FILE_LIMITS, URLS } = require('./constants');

class QRImageGenerator {
  /**
   * Genera imagen QR básica
   */
  async generateQRImage(data, options = {}) {
    try {
      const defaultOptions = {
        type: 'png',
        quality: FILE_LIMITS.QR_IMAGE_QUALITY,
        margin: 1,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        },
        width: FILE_LIMITS.QR_IMAGE_SIZE
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Generar QR como buffer
      const qrBuffer = await QRCode.toBuffer(data, mergedOptions);
      
      return qrBuffer;
    } catch (error) {
      throw new Error(`Error generando imagen QR: ${error.message}`);
    }
  }
  
  /**
   * Genera QR con logo/diseño personalizado
   */
  async generateCustomQRImage(data, options = {}) {
    try {
      // Generar QR básico
      const qrBuffer = await this.generateQRImage(data, {
        margin: 2,
        width: 600 // Más grande para poder agregar logo
      });
      
      let finalImage = sharp(qrBuffer);
      
      // Si se proporciona un logo, agregarlo al centro
      if (options.logoPath || options.logoBuffer) {
        const logoSource = options.logoPath || options.logoBuffer;
        const logoSize = 80; // Tamaño del logo
        
        // Redimensionar logo
        const processedLogo = await sharp(logoSource)
          .resize(logoSize, logoSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();
        
        // Componer QR con logo
        finalImage = finalImage.composite([{
          input: processedLogo,
          gravity: 'center'
        }]);
      }
      
      // Redimensionar al tamaño final
      const finalBuffer = await finalImage
        .resize(FILE_LIMITS.QR_IMAGE_SIZE, FILE_LIMITS.QR_IMAGE_SIZE)
        .png({ quality: Math.floor(FILE_LIMITS.QR_IMAGE_QUALITY * 100) })
        .toBuffer();
      
      return finalBuffer;
    } catch (error) {
      throw new Error(`Error generando QR personalizado: ${error.message}`);
    }
  }
  
  /**
   * Genera QR para perfil específico
   */
  async generateProfileQR(qrCode, options = {}) {
    const url = `${URLS.QR_BASE}/${qrCode}`;
    
    return await this.generateQRImage(url, {
      ...options,
      // Opciones específicas para perfiles
      margin: 1,
      quality: 0.95
    });
  }
  
  /**
   * Valida que el QR sea legible
   */
  async validateQRReadability(qrBuffer) {
    try {
      // Usar sharp para analizar la imagen
      const { width, height } = await sharp(qrBuffer).metadata();
      
      // Verificaciones básicas
      if (width < 100 || height < 100) {
        throw new Error('QR muy pequeño para ser legible');
      }
      
      if (width > 2048 || height > 2048) {
        throw new Error('QR demasiado grande');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Error validando QR: ${error.message}`);
    }
  }
  
  /**
   * Convierte buffer a data URL para frontend
   */
  bufferToDataURL(buffer, mimeType = 'image/png') {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
  
  /**
   * Guarda QR en sistema de archivos (temporal)
   */
  async saveQRToFile(qrBuffer, filename) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'temp');
      
      // Asegurar que el directorio existe
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, qrBuffer);
      
      return filePath;
    } catch (error) {
      throw new Error(`Error guardando QR: ${error.message}`);
    }
  }
}

module.exports = new QRImageGenerator();