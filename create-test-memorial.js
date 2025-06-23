// create-test-memorial.js
// Script para crear un memorial de prueba
// ===================================

require('dotenv').config();
const mongoose = require('mongoose');

async function createTestMemorial() {
  try {
    console.log('🔄 Creando memorial de prueba...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
    });
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    // =====================================================
    // VERIFICAR O CREAR CLIENTE
    // =====================================================
    console.log('\n👤 VERIFICANDO CLIENTE...');
    const clientsCollection = db.collection('clients');
    
    let testClient = await clientsCollection.findOne({ 
      codigoCliente: 'CL-001' 
    });
    
    if (!testClient) {
      console.log('🔧 Creando cliente de prueba...');
      testClient = {
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '+1234567890',
        email: 'juan.perez@example.com',
        codigoCliente: 'CL-001',
        direccion: 'Calle Principal 123',
        observaciones: 'Cliente de prueba para sistema',
        activo: true,
        fechaRegistro: new Date(),
        ultimaActualizacion: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const clientResult = await clientsCollection.insertOne(testClient);
      testClient._id = clientResult.insertedId;
      console.log('✅ Cliente creado:', testClient._id);
    } else {
      console.log('ℹ️  Cliente existente encontrado:', testClient._id);
    }
    
    // =====================================================
    // CREAR MEMORIAL DE PRUEBA
    // =====================================================
    console.log('\n🌹 CREANDO MEMORIAL...');
    const profilesCollection = db.collection('profiles');
    
    // Verificar si ya existe
    const existingProfile = await profilesCollection.findOne({
      nombre: 'María Elena González'
    });
    
    if (existingProfile) {
      console.log('ℹ️  Memorial de prueba ya existe:', existingProfile._id);
      return;
    }
    
    const memorialData = {
      nombre: 'María Elena González',
      fechaNacimiento: new Date('1950-03-15'),
      fechaFallecimiento: new Date('2023-12-10'),
      fotoPerfil: null,
      frase: 'Siempre en nuestros corazones, tu amor perdura eternamente',
      ubicacion: {
        ciudad: 'Buenos Aires',
        pais: 'Argentina',
        cementerio: 'Cementerio de la Recoleta'
      },
      biografia: 'María Elena fue una mujer extraordinaria que dedicó su vida a su familia y a ayudar a otros. Trabajó como maestra durante 35 años, formando a generaciones de niños con amor y paciencia. Era conocida por su sonrisa cálida, su generosidad infinita y su capacidad de hacer sentir especial a cada persona que conocía. Le encantaba cocinar para la familia, cuidar su jardín de rosas y contar historias a sus nietos. Su legado de amor y bondad continúa viviendo en todos aquellos que tuvieron la fortuna de conocerla.',
      profesion: 'Maestra de educación primaria',
      familia: {
        conyuge: 'Roberto González',
        hijos: ['Ana González', 'Carlos González', 'Lucia González'],
        padres: ['Pedro Ramírez', 'Carmen López'],
        hermanos: ['José Ramírez', 'Silvia Ramírez']
      },
      cliente: testClient._id,
      codigoComentarios: 'FAMILIA-2023-ABC',
      codigoCliente: 'CLIENTE-2023-XYZ',
      comentariosHabilitados: true,
      fechaLimiteComentarios: null,
      isPublic: true,
      isActive: true,
      configuracion: {
        slideshow: {
          autoplay: true,
          interval: 5000,
          transition: 'fade'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const memorial = await profilesCollection.insertOne(memorialData);
    console.log('✅ Memorial creado exitosamente:', memorial.insertedId);
    
    // =====================================================
    // CREAR QR PARA EL MEMORIAL
    // =====================================================
    console.log('\n📱 CREANDO QR...');
    const qrCollection = db.collection('qrs');
    
    const qrCode = `MEM${Date.now().toString().slice(-6)}`;
    const qrUrl = `${process.env.QR_BASE_URL}/${qrCode}`;
    
    const qrData = {
      code: qrCode,
      url: qrUrl,
      tipo: 'profile',
      referenciaId: memorial.insertedId,
      tipoModelo: 'Profile',
      imagenUrl: null,
      estadisticas: {
        vistas: 0,
        escaneos: 0,
        ultimaVisita: new Date(),
        visitasUnicas: []
      },
      isActive: true,
      creadoPor: testClient._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const qr = await qrCollection.insertOne(qrData);
    console.log('✅ QR creado:', qrCode);
    
    // Vincular QR al memorial
    await profilesCollection.updateOne(
      { _id: memorial.insertedId },
      { $set: { qr: qr.insertedId } }
    );
    console.log('✅ QR vinculado al memorial');
    
    // =====================================================
    // CREAR DASHBOARD
    // =====================================================
    console.log('\n🎨 CREANDO DASHBOARD...');
    const dashboardsCollection = db.collection('dashboards');
    
    const dashboardData = {
      perfil: memorial.insertedId,
      secciones: [
        {
          tipo: 'biografia',
          activa: true,
          orden: 0,
          contenido: {
            titulo: 'Biografía',
            descripcion: 'Historia de vida y momentos especiales',
            icono: 'user'
          },
          configuracion: {
            tipo: 'list',
            mostrarTitulos: true,
            mostrarDescripciones: true
          }
        },
        {
          tipo: 'galeria_fotos',
          activa: true,
          orden: 1,
          contenido: {
            titulo: 'Galería de Fotos',
            descripcion: 'Recuerdos en imágenes',
            icono: 'image'
          },
          configuracion: {
            tipo: 'grid',
            columnas: 3,
            mostrarTitulos: true,
            mostrarDescripciones: false
          }
        },
        {
          tipo: 'condolencias',
          activa: true,
          orden: 2,
          contenido: {
            titulo: 'Condolencias',
            descripcion: 'Mensajes de familiares y amigos',
            icono: 'heart'
          },
          configuracion: {
            tipo: 'list',
            mostrarTitulos: false,
            mostrarDescripciones: true
          }
        }
      ],
      configuracion: {
        tema: 'clasico',
        colorPrimario: '#8B4513',
        colorSecundario: '#F5F5DC',
        colorAccento: '#D2691E',
        fuente: 'serif',
        tamanoFuente: 'mediano',
        permitirCondolencias: true,
        mostrarEstadisticas: false,
        mostrarFechas: true
      },
      privacidad: {
        publico: true,
        requierePassword: false,
        mensajeBienvenida: 'Bienvenidos al memorial de María Elena González'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const dashboard = await dashboardsCollection.insertOne(dashboardData);
    console.log('✅ Dashboard creado:', dashboard.insertedId);
    
    console.log('\n🎉 Memorial de prueba creado exitosamente!');
    console.log('📋 Información del memorial:');
    console.log(`   ID: ${memorial.insertedId}`);
    console.log(`   Nombre: ${memorialData.nombre}`);
    console.log(`   Cliente: ${testClient.nombre} ${testClient.apellido}`);
    console.log(`   Código QR: ${qrCode}`);
    console.log(`   URL: ${qrUrl}`);
    console.log('\n💡 Ahora puedes probar el sistema de Media Management');
    
  } catch (error) {
    console.error('❌ Error creando memorial de prueba:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar script
createTestMemorial();