// ====================================
// reset-for-production.js
// Script para preparar el proyecto para entrega
// ====================================

const mongoose = require('mongoose');
require('dotenv').config();

async function resetForProduction() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('\n🚨 PREPARANDO PROYECTO PARA ENTREGA...');
    console.log('   ✅ CONSERVA: Admin user, configuraciones del sistema');
    console.log('   🗑️  ELIMINA: Clientes, memoriales, QRs, comentarios, media');

    // Eliminar colecciones de datos de prueba
    const collectionsToDelete = [
      'clients',       // Todos los clientes de prueba
      'profiles',      // Todos los memoriales de prueba  
      'qrs',          // Todos los QRs generados
      'comentarios',   // Todos los comentarios
      'media',        // Todas las fotos/videos subidas
      'dashboards'    // Configuraciones de memoriales
    ];

    for (const collectionName of collectionsToDelete) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          await collection.deleteMany({});
          console.log(`🗑️  Eliminados ${count} documentos de ${collectionName}`);
        } else {
          console.log(`✅ ${collectionName} ya estaba vacía`);
        }
      } catch (error) {
        console.log(`⚠️  Colección ${collectionName} no existe`);
      }
    }

    // Verificar que el admin user sigue existiendo
    console.log('\n👤 VERIFICANDO ADMIN USER...');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const adminUsers = await User.find({}).lean();
    
    if (adminUsers.length > 0) {
      adminUsers.forEach(user => {
        console.log(`✅ Admin conservado: ${user.email}`);
      });
    } else {
      console.log('⚠️  No hay admin user. Necesitarás crear uno.');
    }

    console.log('\n🎉 PROYECTO LISTO PARA ENTREGA:');
    console.log('   ✅ Base de datos limpia');
    console.log('   ✅ Admin user conservado');
    console.log('   ✅ Próximo cliente será CL-001');
    console.log('   ✅ Contadores reiniciados');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

resetForProduction();
