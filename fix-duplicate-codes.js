// ====================================
// fix-duplicate-codes.js  
// Script para arreglar códigos de cliente duplicados
// ====================================

const mongoose = require('mongoose');
require('dotenv').config();

async function fixDuplicateCodes() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Cargar modelo de Cliente
    const Client = require('./src/models/Client');

    console.log('\n🔍 Revisando clientes existentes...');
    const clients = await Client.find({}).sort({ createdAt: 1 });
    console.log(`📊 Encontrados ${clients.length} clientes`);

    if (clients.length === 0) {
      console.log('✅ No hay clientes para revisar');
      return;
    }

    // Mostrar códigos actuales
    console.log('\n📋 CÓDIGOS ACTUALES:');
    clients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.codigoCliente} - ${client.nombre} ${client.apellido}`);
    });

    // Buscar duplicados
    const codes = clients.map(c => c.codigoCliente);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  CÓDIGOS DUPLICADOS ENCONTRADOS:');
      duplicates.forEach(code => {
        console.log(`   🔄 ${code}`);
      });

      // Regenerar códigos únicos
      console.log('\n🔧 Regenerando códigos únicos...');
      
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const newCode = `CL-${String(i + 1).padStart(3, '0')}`;
        
        if (client.codigoCliente !== newCode) {
          console.log(`   🔄 ${client.codigoCliente} → ${newCode} (${client.nombre})`);
          
          // Actualizar directamente en la base sin triggear middleware
          await Client.updateOne(
            { _id: client._id },
            { $set: { codigoCliente: newCode } }
          );
        }
      }
      
      console.log('✅ Códigos regenerados exitosamente');
      
    } else {
      console.log('\n✅ No se encontraron códigos duplicados');
    }

    // Verificar resultado final
    console.log('\n📋 CÓDIGOS FINALES:');
    const updatedClients = await Client.find({}).sort({ createdAt: 1 });
    updatedClients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.codigoCliente} - ${client.nombre} ${client.apellido}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

fixDuplicateCodes();
