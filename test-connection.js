// test-connection.js
// Script rápido para probar conexión
// ==================================

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔍 Probando conexión a MongoDB Atlas...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ ¡CONEXIÓN EXITOSA!');
    console.log('🏠 Host:', conn.connection.host);
    console.log('📊 Database:', conn.connection.name);
    console.log('🎉 ¡Todo funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testConnection();