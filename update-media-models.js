// update-media-models.js
// Script para actualizar modelos de Media y Profile con nuevos campos
// ===================================

require('dotenv').config();
const mongoose = require('mongoose');

async function updateMediaModels() {
  try {
    console.log('🔄 Iniciando actualización de modelos Media y Profile...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
    });
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    // =====================================================
    // ACTUALIZAR MODELO MEDIA
    // =====================================================
    console.log('\n📊 ACTUALIZANDO MODELO MEDIA...');
    const mediaCollection = db.collection('media');
    
    // Contar documentos sin el campo seccion
    const mediaWithoutSection = await mediaCollection.countDocuments({
      seccion: { $exists: false }
    });
    console.log(`📄 Documentos Media sin campo 'seccion': ${mediaWithoutSection}`);
    
    if (mediaWithoutSection > 0) {
      // Actualizar documentos sin seccion (asignar 'galeria' por defecto)
      const result = await mediaCollection.updateMany(
        { seccion: { $exists: false } },
        { $set: { seccion: 'galeria' } }
      );
      console.log(`✅ Media - Actualizados ${result.modifiedCount} documentos con seccion='galeria'`);
    }
    
    // Verificar tipos de media y agregar soporte para YouTube
    const mediaWithInvalidType = await mediaCollection.countDocuments({
      tipo: { $nin: ['foto', 'video', 'youtube'] }
    });
    console.log(`📄 Documentos Media con tipos no válidos: ${mediaWithInvalidType}`);
    
    // =====================================================
    // ACTUALIZAR MODELO PROFILE
    // =====================================================
    console.log('\n👤 ACTUALIZANDO MODELO PROFILE...');
    const profileCollection = db.collection('profiles');
    
    // Contar perfiles sin configuracion de slideshow
    const profilesWithoutConfig = await profileCollection.countDocuments({
      'configuracion.slideshow': { $exists: false }
    });
    console.log(`📄 Perfiles sin configuración de slideshow: ${profilesWithoutConfig}`);
    
    if (profilesWithoutConfig > 0) {
      // Agregar configuración por defecto
      const defaultSlideshowConfig = {
        autoplay: true,
        interval: 5000,
        transition: 'fade'
      };
      
      const result = await profileCollection.updateMany(
        { 'configuracion.slideshow': { $exists: false } },
        { $set: { 'configuracion.slideshow': defaultSlideshowConfig } }
      );
      console.log(`✅ Profiles - Actualizados ${result.modifiedCount} documentos con configuración de slideshow`);
    }
    
    // =====================================================
    // VERIFICAR ÍNDICES
    // =====================================================
    console.log('\n🔍 VERIFICANDO ÍNDICES...');
    
    // Verificar índices de Media
    const mediaIndexes = await mediaCollection.indexes();
    console.log('Índices de Media:');
    mediaIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Crear índice para seccion si no existe
    try {
      await mediaCollection.createIndex(
        { memorial: 1, seccion: 1, estaActivo: 1 },
        { background: true, name: 'memorial_seccion_activo' }
      );
      console.log('✅ Media - Índice memorial_seccion_activo creado/verificado');
    } catch (error) {
      if (error.code === 85) { // Index already exists
        console.log('ℹ️  Media - Índice memorial_seccion_activo ya existe');
      } else {
        console.log('⚠️  Error creando índice:', error.message);
      }
    }
    
    // Verificar índices de Profile
    const profileIndexes = await profileCollection.indexes();
    console.log('\nÍndices de Profile:');
    profileIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // =====================================================
    // ESTADÍSTICAS FINALES
    // =====================================================
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    
    const totalMedia = await mediaCollection.countDocuments();
    const mediaBySection = await mediaCollection.aggregate([
      { $group: { _id: '$seccion', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log(`📄 Total documentos Media: ${totalMedia}`);
    console.log('📁 Media por sección:');
    mediaBySection.forEach(section => {
      console.log(`   ${section._id}: ${section.count}`);
    });
    
    const totalProfiles = await profileCollection.countDocuments();
    const profilesWithSlideshow = await profileCollection.countDocuments({
      'configuracion.slideshow': { $exists: true }
    });
    
    console.log(`👤 Total perfiles: ${totalProfiles}`);
    console.log(`🎞️ Perfiles con configuración slideshow: ${profilesWithSlideshow}`);
    
    console.log('\n🎉 Actualización de modelos completada exitosamente!');
    console.log('💡 Los nuevos campos están listos para usar en el sistema de Media Management');
    
  } catch (error) {
    console.error('❌ Error en actualización de modelos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar script
updateMediaModels();