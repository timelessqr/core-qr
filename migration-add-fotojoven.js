// ====================================
// migration-add-fotojoven.js - Script para agregar campo fotoJoven a perfiles existentes
// ====================================

const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelo
const Profile = require('./src/models/Profile');

async function addFotoJovenToExistingProfiles() {
  try {
    console.log('🔄 Iniciando migración para agregar campo fotoJoven...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los perfiles que no tienen el campo fotoJoven
    const profiles = await Profile.find({
      fotoJoven: { $exists: false }
    });

    console.log(`📋 Encontrados ${profiles.length} perfiles para actualizar`);

    if (profiles.length === 0) {
      console.log('✅ No hay perfiles que necesiten migración');
      return;
    }

    // Actualizar cada perfil
    let updated = 0;
    for (const profile of profiles) {
      try {
        await Profile.findByIdAndUpdate(
          profile._id,
          { fotoJoven: null },
          { new: true }
        );
        updated++;
        console.log(`✅ Actualizado perfil: ${profile.nombre} (ID: ${profile._id})`);
      } catch (error) {
        console.error(`❌ Error actualizando perfil ${profile._id}:`, error.message);
      }
    }

    console.log(`✅ Migración completada. Perfiles actualizados: ${updated}/${profiles.length}`);

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar migración
if (require.main === module) {
  addFotoJovenToExistingProfiles()
    .then(() => {
      console.log('🎉 Migración finalizada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal en la migración:', error);
      process.exit(1);
    });
}

module.exports = addFotoJovenToExistingProfiles;