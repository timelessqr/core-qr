// ====================================
// clear-database.js - Script para limpiar completamente la base de datos
// ====================================
const mongoose = require('mongoose');
require('dotenv').config();

async function clearDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Encontradas ${collections.length} colecciones`);

    // Borrar cada colección
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🗑️  Borrando colección: ${collectionName}`);
      await mongoose.connection.db.collection(collectionName).deleteMany({});
    }

    console.log('✅ Base de datos limpiada completamente');
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Confirmación de seguridad
console.log('⚠️  ATENCIÓN: Este script borrará TODA la base de datos');
console.log('⚠️  Esto incluye usuarios, clientes, memoriales y QRs');
console.log('⚠️  Esta acción NO se puede deshacer');
console.log('');

// Ejecutar
clearDatabase();
