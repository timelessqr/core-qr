// ====================================
// check-database.js
// Script para revisar qué hay en la base de datos
// ====================================

const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 COLECCIONES EN LA BASE DE DATOS:');
    collections.forEach(col => {
      console.log(`   📄 ${col.name}`);
    });

    // Revisar usuarios
    console.log('\n👥 USUARIOS EXISTENTES:');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({}).lean();
    
    if (users.length === 0) {
      console.log('   ⚠️  No hay usuarios en la base de datos');
    } else {
      users.forEach((user, index) => {
        console.log(`\n   ${index + 1}. 👤 ${user.nombre || 'Sin nombre'}`);
        console.log(`      📧 Email: ${user.email}`);
        console.log(`      🏆 Plan: ${user.plan || 'No definido'}`);
        console.log(`      📅 Creado: ${user.createdAt}`);
        console.log(`      🔄 Activo: ${user.isActive !== false ? 'Sí' : 'No'}`);
      });
    }

    // Revisar clientes si existen
    console.log('\n👥 CLIENTES EXISTENTES:');
    try {
      const Client = mongoose.model('Client', new mongoose.Schema({}, { strict: false }));
      const clients = await Client.find({}).lean();
      
      if (clients.length === 0) {
        console.log('   ⚠️  No hay clientes registrados');
      } else {
        clients.forEach((client, index) => {
          console.log(`\n   ${index + 1}. 👤 ${client.nombre} ${client.apellido || ''}`);
          console.log(`      📞 Teléfono: ${client.telefono || 'No definido'}`);
          console.log(`      🔢 Código: ${client.codigoCliente}`);
          console.log(`      📅 Creado: ${client.createdAt}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️  No hay colección de clientes aún');
    }

    // Revisar perfiles/memoriales si existen
    console.log('\n🌹 MEMORIALES EXISTENTES:');
    try {
      const Profile = mongoose.model('Profile', new mongoose.Schema({}, { strict: false }));
      const profiles = await Profile.find({}).lean();
      
      if (profiles.length === 0) {
        console.log('   ⚠️  No hay memoriales creados');
      } else {
        profiles.forEach((profile, index) => {
          console.log(`\n   ${index + 1}. 🌹 ${profile.nombre}`);
          console.log(`      👤 Cliente: ${profile.cliente || profile.usuario || 'No definido'}`);
          console.log(`      🎂 Nacimiento: ${profile.fechaNacimiento || 'No definido'}`);
          console.log(`      🕊️  Fallecimiento: ${profile.fechaFallecimiento || 'No definido'}`);
          console.log(`      📅 Creado: ${profile.createdAt}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️  No hay colección de perfiles aún');
    }

    // Estadísticas generales
    console.log('\n📊 ESTADÍSTICAS:');
    console.log(`   👥 Total usuarios: ${users.length}`);
    
    let clientCount = 0;
    let profileCount = 0;
    
    try {
      const Client = mongoose.model('Client', new mongoose.Schema({}, { strict: false }));
      clientCount = await Client.countDocuments();
    } catch (e) {}
    
    try {
      const Profile = mongoose.model('Profile', new mongoose.Schema({}, { strict: false }));
      profileCount = await Profile.countDocuments();
    } catch (e) {}
    
    console.log(`   🏢 Total clientes: ${clientCount}`);
    console.log(`   🌹 Total memoriales: ${profileCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Función para limpiar la base de datos
async function clearDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('⚠️  LIMPIANDO TODA LA BASE DE DATOS...');
    
    // Eliminar todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      await mongoose.connection.db.collection(collection.name).drop();
      console.log(`🗑️  Eliminada colección: ${collection.name}`);
    }
    
    console.log('✅ Base de datos completamente limpia');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar según argumentos
const command = process.argv[2];

if (command === 'clear') {
  console.log('🚨 ATENCIÓN: Vas a eliminar TODA la base de datos');
  console.log('   Presiona Ctrl+C en los próximos 3 segundos para cancelar...');
  setTimeout(() => {
    clearDatabase();
  }, 3000);
} else {
  checkDatabase();
}
