// cleanup-indexes.js
// Script para limpiar índices duplicados (ACTUALIZADO)
// ===================================

require('dotenv').config();
const mongoose = require('mongoose');

async function cleanupIndexes() {
  try {
    console.log('🧹 Iniciando limpieza de índices...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
    });
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    // =====================================================
    // LIMPIAR COLECCIÓN PROFILES
    // =====================================================
    console.log('\n📋 LIMPIANDO PROFILES...');
    const profilesCollection = db.collection('profiles');
    
    try {
      const profileIndexes = await profilesCollection.indexes();
      console.log('Índices actuales en profiles:');
      profileIndexes.forEach((index, i) => {
        console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      });
      
      // Eliminar índices (excepto _id)
      for (const index of profileIndexes) {
        if (index.name !== '_id_') {
          try {
            await profilesCollection.dropIndex(index.name);
            console.log(`❌ Eliminado en profiles: ${index.name}`);
          } catch (error) {
            console.log(`⚠️  No se pudo eliminar ${index.name}: ${error.message}`);
          }
        }
      }
      
      // Recrear índices optimizados
      await profilesCollection.createIndex(
        { cliente: 1, isActive: 1 }, 
        { background: true, name: 'cliente_isActive' }
      );
      console.log('✅ Profiles - Creado: cliente_isActive');
      
      await profilesCollection.createIndex(
        { qr: 1 }, 
        { unique: true, sparse: true, background: true, name: 'qr_unique' }
      );
      console.log('✅ Profiles - Creado: qr_unique');
      
      await profilesCollection.createIndex(
        { fechaNacimiento: 1, fechaFallecimiento: 1 }, 
        { background: true, name: 'fechas_nacimiento_fallecimiento' }
      );
      console.log('✅ Profiles - Creado: fechas_nacimiento_fallecimiento');
      
      await profilesCollection.createIndex(
        { codigoComentarios: 1 }, 
        { sparse: true, background: true, name: 'codigo_comentarios' }
      );
      console.log('✅ Profiles - Creado: codigo_comentarios');
      
      await profilesCollection.createIndex(
        { codigoCliente: 1 }, 
        { sparse: true, background: true, name: 'codigo_cliente' }
      );
      console.log('✅ Profiles - Creado: codigo_cliente');
      
    } catch (error) {
      console.log('⚠️  Error con profiles:', error.message);
    }
    
    // =====================================================
    // LIMPIAR COLECCIÓN DASHBOARDS
    // =====================================================
    console.log('\n📋 LIMPIANDO DASHBOARDS...');
    const dashboardsCollection = db.collection('dashboards');
    
    try {
      const dashboardIndexes = await dashboardsCollection.indexes();
      console.log('Índices actuales en dashboards:');
      dashboardIndexes.forEach((index, i) => {
        console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      });
      
      // Eliminar índices (excepto _id y perfil_1 que debe mantenerse por unique)
      for (const index of dashboardIndexes) {
        if (index.name !== '_id_' && index.name !== 'perfil_1') {
          try {
            await dashboardsCollection.dropIndex(index.name);
            console.log(`❌ Eliminado en dashboards: ${index.name}`);
          } catch (error) {
            console.log(`⚠️  No se pudo eliminar ${index.name}: ${error.message}`);
          }
        }
      }
      
      // Recrear índices necesarios (perfil ya tiene índice único automático)
      await dashboardsCollection.createIndex(
        { 'configuracion.tema': 1 }, 
        { background: true, name: 'configuracion_tema' }
      );
      console.log('✅ Dashboards - Creado: configuracion_tema');
      
      await dashboardsCollection.createIndex(
        { 'privacidad.publico': 1 }, 
        { background: true, name: 'privacidad_publico' }
      );
      console.log('✅ Dashboards - Creado: privacidad_publico');
      
    } catch (error) {
      console.log('⚠️  Error con dashboards:', error.message);
    }
    
    console.log('\n🎉 Limpieza de índices completada exitosamente!');
    console.log('💡 Los warnings de índices duplicados deberían desaparecer ahora');
    
  } catch (error) {
    console.error('❌ Error en limpieza de índices:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar script
cleanupIndexes();