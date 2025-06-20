// ====================================
// create-initial-admin.js
// Script para crear el primer usuario admin
// ====================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Modelo User simplificado para este script
const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  telefono: { type: String, trim: true },
  plan: { type: String, enum: ['basico', 'premium'], default: 'premium' },
  perfiles: [{ type: mongoose.Schema.Types.ObjectId }],
  isActive: { type: Boolean, default: true },
  ultimoLogin: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model('User', userSchema);

async function createInitialAdmin() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({});
    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario admin:');
      console.log(`   📧 Email: ${existingAdmin.email}`);
      console.log(`   👤 Nombre: ${existingAdmin.nombre}`);
      console.log(`   📅 Creado: ${existingAdmin.createdAt}`);
      console.log('\n   ℹ️  Para crear un nuevo admin, primero elimina el existente en MongoDB');
      return;
    }

    // Datos del dueño de la empresa (admin único)
    const adminData = {
      nombre: 'Dueño de la Empresa',
      email: 'admin@lazosdevida.com',
      password: 'admin123', // Contraseña simple para desarrollo
      telefono: '+54 11 1234-5678',
      plan: 'premium'
    };

    console.log('👤 Creando cuenta del dueño de la empresa...');
    const admin = new User(adminData);
    await admin.save();
    
    console.log('\n🎉 ¡Cuenta del dueño creada exitosamente!');
    console.log('═'.repeat(50));
    console.log('📋 DATOS DE ACCESO - DUEÑO DE LA EMPRESA:');
    console.log(`   📧 Email: ${adminData.email}`);
    console.log(`   🔐 Password: ${adminData.password}`);
    console.log(`   👤 Nombre: ${adminData.nombre}`);
    console.log(`   📱 Teléfono: ${adminData.telefono}`);
    console.log(`   🏆 Plan: ${adminData.plan}`);
    console.log('═'.repeat(50));
    console.log('\n🔥 PRÓXIMOS PASOS:');
    console.log('   1. Hacer login con estas credenciales');
    console.log('   2. Cambiar la contraseña por seguridad');
    console.log('   3. Registrar tu primer cliente');
    console.log('   4. Crear memorial y probar QR');
    console.log('   5. ¡Empezar a vender el servicio!');
    console.log('\n💡 COMANDO DE LOGIN:');
    console.log(`curl -X POST http://localhost:3000/api/auth/login \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"email":"${adminData.email}","password":"${adminData.password}"}'`);

  } catch (error) {
    console.error('❌ Error creando admin:', error.message);
    if (error.code === 11000) {
      console.log('⚠️  El email ya está registrado');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Función para eliminar todos los usuarios (para testing)
async function clearAllUsers() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const result = await User.deleteMany({});
    console.log(`🗑️  Eliminados ${result.deletedCount} usuarios`);
    
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
  console.log('⚠️  ELIMINANDO TODOS LOS USUARIOS...');
  clearAllUsers();
} else {
  createInitialAdmin();
}
