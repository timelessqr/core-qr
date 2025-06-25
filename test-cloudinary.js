// ====================================
// test-cloudinary.js - Script para verificar configuración de Cloudinary
// ====================================

require('dotenv').config();

async function testCloudinaryConfig() {
  console.log('🔧 Verificando configuración de Cloudinary...\n');

  // 1. Verificar variables de entorno
  console.log('📋 Variables de entorno:');
  console.log(`  CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`  CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`  CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`  STORAGE_PROVIDER: ${process.env.STORAGE_PROVIDER}\n`);

  // 2. Intentar cargar el servicio de Cloudinary
  try {
    const cloudinary = require('cloudinary').v2;
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    console.log('☁️ Cloudinary SDK cargado exitosamente');
    
    // 3. Verificar conectividad
    console.log('🌐 Verificando conectividad...');
    
    const result = await cloudinary.api.ping();
    console.log(`✅ Ping exitoso: ${result.status}`);
    
    // 4. Obtener información de la cuenta
    console.log('\n📊 Información de la cuenta:');
    const usage = await cloudinary.api.usage();
    
    console.log(`  Plan: ${usage.plan}`);
    console.log(`  Almacenamiento usado: ${formatBytes(usage.storage.usage)} / ${formatBytes(usage.storage.limit)}`);
    console.log(`  Recursos totales: ${usage.resources}`);
    console.log(`  Créditos usados: ${usage.credits?.used || 0} / ${usage.credits?.limit || 'Sin límite'}`);
    
    // 5. Probar generación de URL con transformaciones
    console.log('\n🖼️ Probando generación de URLs con transformaciones:');
    
    const testPublicId = 'sample';
    const urls = {
      original: cloudinary.url(testPublicId),
      thumbnail: cloudinary.url(testPublicId, { width: 150, height: 150, crop: 'thumb' }),
      medium: cloudinary.url(testPublicId, { width: 800, height: 600, crop: 'limit' }),
      optimized: cloudinary.url(testPublicId, { quality: 'auto', fetch_format: 'auto' })
    };
    
    Object.entries(urls).forEach(([type, url]) => {
      console.log(`  ${type}: ${url}`);
    });
    
    console.log('\n✅ ¡Cloudinary está configurado correctamente y listo para usar!');
    
  } catch (error) {
    console.error('❌ Error verificando Cloudinary:', error.message);
    
    if (error.message.includes('Must supply api_key')) {
      console.log('\n💡 Solución: Verifica que CLOUDINARY_API_KEY esté configurado correctamente');
    } else if (error.message.includes('Must supply api_secret')) {
      console.log('\n💡 Solución: Verifica que CLOUDINARY_API_SECRET esté configurado correctamente');
    } else if (error.message.includes('Must supply cloud_name')) {
      console.log('\n💡 Solución: Verifica que CLOUDINARY_CLOUD_NAME esté configurado correctamente');
    } else {
      console.log('\n💡 Verifica tu conexión a internet y las credenciales de Cloudinary');
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Ejecutar verificación
if (require.main === module) {
  testCloudinaryConfig()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error en la verificación:', error);
      process.exit(1);
    });
}

module.exports = { testCloudinaryConfig };
