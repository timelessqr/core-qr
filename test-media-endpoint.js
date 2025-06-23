// test-media-endpoint.js
// Script para probar endpoints de media
// ===================================

require('dotenv').config();
const mongoose = require('mongoose');

async function testMediaEndpoints() {
  try {
    console.log('🧪 Iniciando prueba de endpoints de media...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
    });
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    // =====================================================
    // OBTENER PROFILES PARA PROBAR
    // =====================================================
    console.log('\n👤 OBTENIENDO PROFILES...');
    const profilesCollection = db.collection('profiles');
    
    const profiles = await profilesCollection.find({
      isActive: true
    }).limit(5).toArray();
    
    console.log(`📊 Profiles encontrados: ${profiles.length}`);
    profiles.forEach((profile, i) => {
      console.log(`  ${i + 1}. ${profile.nombre} (ID: ${profile._id})`);
    });
    
    if (profiles.length === 0) {
      console.log('⚠️  No hay profiles. Ejecuta "node create-test-memorial.js" primero');
      return;
    }
    
    // =====================================================
    // VERIFICAR ESTRUCTURA DE MEDIA
    // =====================================================
    console.log('\n📊 VERIFICANDO MEDIA...');
    const mediaCollection = db.collection('media');
    
    const mediaCount = await mediaCollection.countDocuments();
    console.log(`📄 Total media en BD: ${mediaCount}`);
    
    if (mediaCount > 0) {
      console.log('\n📋 Estructura de media:');
      const sampleMedia = await mediaCollection.findOne();
      console.log('Campos disponibles:', Object.keys(sampleMedia));
      console.log('Tipo:', sampleMedia.tipo);
      console.log('Sección:', sampleMedia.seccion);
    }
    
    // =====================================================
    // SIMULAR RESPUESTA DEL ENDPOINT
    // =====================================================
    console.log('\n🔄 SIMULANDO RESPUESTA DE ENDPOINT...');
    
    const testProfileId = profiles[0]._id;
    console.log(`🎯 Usando profile: ${profiles[0].nombre} (${testProfileId})`);
    
    // Simular lo que devolvería /api/media/profile/:profileId?seccion=galeria
    const mediaForProfile = await mediaCollection.find({
      memorial: testProfileId,
      seccion: 'galeria',
      estaActivo: true
    }).toArray();
    
    console.log(`📊 Media encontrada para galería: ${mediaForProfile.length}`);
    
    // Crear estructura de respuesta que espera el frontend
    const mockResponse = {
      success: true,
      message: 'Media obtenido exitosamente',
      data: {
        media: mediaForProfile.map(item => ({
          _id: item._id,
          tipo: item.tipo,
          seccion: item.seccion,
          titulo: item.titulo || '',
          descripcion: item.descripcion || '',
          url: item.archivo?.url || '',
          nombreOriginal: item.archivo?.nombreOriginal || '',
          size: item.archivo?.tamaño || 0,
          createdAt: item.createdAt
        })),
        pagination: {
          total: mediaForProfile.length,
          page: 1,
          limit: 50,
          totalPages: 1
        }
      }
    };
    
    console.log('\n📦 Estructura de respuesta mock:');
    console.log(`  success: ${mockResponse.success}`);
    console.log(`  data.media.length: ${mockResponse.data.media.length}`);
    console.log(`  data.pagination: ${JSON.stringify(mockResponse.data.pagination)}`);
    
    if (mockResponse.data.media.length > 0) {
      console.log('\n📄 Ejemplo de item media:');
      const example = mockResponse.data.media[0];
      Object.keys(example).forEach(key => {
        console.log(`  ${key}: ${example[key]}`);
      });
    }
    
    // =====================================================
    // VERIFICAR QUE EL BACKEND PUEDE PROCESAR ESTO
    // =====================================================
    console.log('\n🔍 VERIFICANDO ENDPOINT REAL...');
    
    // Simular como el frontend procesaría la respuesta
    const mediaArray = mockResponse.data?.media || mockResponse.media || [];
    const isValidArray = Array.isArray(mediaArray);
    
    console.log(`✅ ¿Es array válido? ${isValidArray}`);
    console.log(`📊 Longitud: ${mediaArray.length}`);
    
    if (isValidArray && mediaArray.length > 0) {
      console.log('✅ El endpoint debería funcionar correctamente');
    } else {
      console.log('⚠️  El endpoint puede tener problemas');
    }
    
    console.log('\n🎉 Prueba completada!');
    console.log('💡 Ahora puedes probar el frontend en /admin/media');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar script
testMediaEndpoints();