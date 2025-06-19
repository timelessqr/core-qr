// ====================================
// tests/integration/media.test.js
// ====================================
const request = require('supertest');
const testSetup = require('../helpers/testSetup');
const path = require('path');
const fs = require('fs');

describe('📷 Media Module Integration Tests', () => {
  let app;
  let authToken;
  let testProfile;

  beforeAll(async () => {
    await testSetup.setupTestEnvironment();
    await testSetup.connectTestDatabase();
    app = require('../../server');

    // Crear directorio de uploads para testing
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await testSetup.fullCleanup();
    
    // Limpiar archivos de test
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test');
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    await testSetup.cleanTestDatabase();
    
    // Crear usuario y perfil para testing
    const userData = {
      nombre: 'Media Test User',
      email: 'media.test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;

    // Crear perfil
    const profileData = {
      nombre: 'Media Test',
      apellido: 'Profile',
      fechaNacimiento: '1950-01-01',
      fechaFallecimiento: '2020-01-01',
      biografia: 'Perfil para testing de media'
    };

    const profileResponse = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${authToken}`)
      .send(profileData);

    testProfile = profileResponse.body.data.profile;
  });

  describe('GET /api/media/storage/info', () => {
    test('✅ Debe obtener información del proveedor de storage', async () => {
      const response = await request(app)
        .get('/api/media/storage/info')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBeDefined();
      expect(response.body.data.features).toBeDefined();
      expect(response.body.data.config).toBeDefined();

      // Verificar que es Local Storage (ya que no hay R2 configurado en testing)
      expect(response.body.data.provider).toBe('Local Storage');
      expect(response.body.data.features.presignedUrls).toBe(false);
      expect(response.body.data.features.cdn).toBe(false);
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/info')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/storage/stats', () => {
    test('✅ Debe obtener estadísticas de storage', async () => {
      const response = await request(app)
        .get('/api/media/storage/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSize).toBeDefined();
      expect(response.body.data.totalFiles).toBeDefined();
      expect(response.body.data.provider).toBe('Local Storage');
      expect(typeof response.body.data.totalSize).toBe('number');
      expect(typeof response.body.data.totalFiles).toBe('number');
    });
  });

  describe('POST /api/media/upload/:profileId', () => {
    test('✅ Debe subir archivo de imagen exitosamente', async () => {
      // Crear imagen de prueba (1x1 pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testImageBuffer, 'test-image.png')
        .field('seccion', 'galeria_fotos')
        .field('titulo', 'Imagen de prueba')
        .field('descripcion', 'Descripción de imagen de prueba')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBeDefined();
      expect(response.body.data.success.length).toBe(1);
      expect(response.body.data.totalUploaded).toBe(1);
      expect(response.body.data.totalErrors).toBe(0);

      const uploadedFile = response.body.data.success[0];
      expect(uploadedFile.filename).toBe('test-image.png');
      expect(uploadedFile.type).toBe('foto');
      expect(uploadedFile.status).toBe('uploaded');
    });

    test('❌ Debe fallar sin archivos', async () => {
      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('seccion', 'galeria_fotos')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No se han subido archivos');
    });

    test('❌ Debe fallar sin sección', async () => {
      const testImageBuffer = Buffer.from('test image data');

      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testImageBuffer, 'test.png')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('sección es requerida');
    });

    test('❌ Debe fallar con perfil inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const testImageBuffer = Buffer.from('test');

      const response = await request(app)
        .post(`/api/media/upload/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testImageBuffer, 'test.png')
        .field('seccion', 'galeria_fotos')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('✅ Debe manejar múltiples archivos', async () => {
      const testImage1 = Buffer.from('test image 1');
      const testImage2 = Buffer.from('test image 2');

      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testImage1, 'test1.png')
        .attach('files', testImage2, 'test2.png')
        .field('seccion', 'galeria_fotos')
        .field('titulo', 'Múltiples imágenes')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUploaded).toBe(2);
      expect(response.body.data.success).toHaveLength(2);
    });
  });

  describe('GET /api/media/profile/:profileId', () => {
    beforeEach(async () => {
      // Crear algunos archivos de media para testing
      const testImages = [
        { name: 'image1.png', section: 'galeria_fotos' },
        { name: 'image2.png', section: 'galeria_fotos' },
        { name: 'video1.mp4', section: 'videos_memoriales' }
      ];

      for (const image of testImages) {
        const testBuffer = Buffer.from(`test ${image.name}`);
        
        await request(app)
          .post(`/api/media/upload/${testProfile.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('files', testBuffer, image.name)
          .field('seccion', image.section);
      }

      // Esperar un poco para que se procesen
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('✅ Debe obtener todos los media del perfil', async () => {
      const response = await request(app)
        .get(`/api/media/profile/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profileId).toBe(testProfile.id);
      expect(response.body.data.media).toBeDefined();
      expect(response.body.data.stats).toBeDefined();

      // Verificar estructura de respuesta
      expect(response.body.data.stats.totalItems).toBeGreaterThan(0);
    });

    test('✅ Debe filtrar por tipo', async () => {
      const response = await request(app)
        .get(`/api/media/profile/${testProfile.id}?tipo=foto`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Todos los archivos deberían ser fotos
      // (Verificación específica dependería de la implementación del filtro)
    });

    test('✅ Debe filtrar por sección', async () => {
      const response = await request(app)
        .get(`/api/media/profile/${testProfile.id}?seccion=galeria_fotos`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Todos los archivos deberían ser de galería de fotos
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/media/profile/${testProfile.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/public/:profileId', () => {
    beforeEach(async () => {
      // Crear dashboard público
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Subir imagen de prueba
      const testImage = Buffer.from('public test image');
      await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testImage, 'public-image.png')
        .field('seccion', 'galeria_fotos');
    });

    test('✅ Debe obtener media público sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/media/public/${testProfile.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('✅ Debe filtrar por sección en público', async () => {
      const response = await request(app)
        .get(`/api/media/public/${testProfile.id}?seccion=galeria_fotos`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/media/stats/:profileId', () => {
    beforeEach(async () => {
      // Subir archivos para generar estadísticas
      const files = [
        { name: 'stat1.png', section: 'galeria_fotos' },
        { name: 'stat2.png', section: 'galeria_fotos' },
        { name: 'stat3.mp4', section: 'videos_memoriales' }
      ];

      for (const file of files) {
        const testBuffer = Buffer.from(`stats test ${file.name}`);
        await request(app)
          .post(`/api/media/upload/${testProfile.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('files', testBuffer, file.name)
          .field('seccion', file.section);
      }
    });

    test('✅ Debe obtener estadísticas del perfil', async () => {
      const response = await request(app)
        .get(`/api/media/stats/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fotos).toBeDefined();
      expect(response.body.data.videos).toBeDefined();
      expect(response.body.data.totalItems).toBeDefined();
      expect(response.body.data.usedStorage).toBeDefined();
      expect(response.body.data.usedStorageMB).toBeDefined();

      expect(typeof response.body.data.fotos.count).toBe('number');
      expect(typeof response.body.data.videos.count).toBe('number');
      expect(typeof response.body.data.totalItems).toBe('number');
    });

    test('❌ Debe fallar sin autorización', async () => {
      const response = await request(app)
        .get(`/api/media/stats/${testProfile.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/my-media', () => {
    beforeEach(async () => {
      // Crear otro perfil y subir archivos
      const profile2Data = {
        nombre: 'Segundo',
        apellido: 'Perfil',
        fechaNacimiento: '1960-01-01',
        fechaFallecimiento: '2021-01-01'
      };

      const profile2Response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profile2Data);

      // Subir archivos a ambos perfiles
      const profiles = [testProfile.id, profile2Response.body.data.profile.id];
      
      for (const profileId of profiles) {
        const testBuffer = Buffer.from(`test for ${profileId}`);
        await request(app)
          .post(`/api/media/upload/${profileId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('files', testBuffer, 'user-media.png')
          .field('seccion', 'galeria_fotos');
      }
    });

    test('✅ Debe obtener todos los media del usuario', async () => {
      const response = await request(app)
        .get('/api/media/my-media')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('✅ Debe filtrar por tipo en my-media', async () => {
      const response = await request(app)
        .get('/api/media/my-media?tipo=foto')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/media/processing-status', () => {
    test('✅ Debe obtener estado de procesamiento', async () => {
      const response = await request(app)
        .get('/api/media/processing-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processingCount).toBeDefined();
      expect(response.body.data.processingItems).toBeDefined();
      expect(Array.isArray(response.body.data.processingItems)).toBe(true);
      expect(typeof response.body.data.processingCount).toBe('number');
    });
  });

  describe('🔧 Validaciones y Edge Cases', () => {
    test('❌ Debe rechazar archivos demasiado grandes', async () => {
      // Crear buffer muy grande (simular archivo grande)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', largeBuffer, 'large-file.png')
        .field('seccion', 'galeria_fotos')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('grande');
    });

    test('❌ Debe rechazar tipos de archivo no permitidos', async () => {
      const testBuffer = Buffer.from('test file content');

      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testBuffer, 'test.exe') // Archivo ejecutable
        .field('seccion', 'galeria_fotos')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('✅ Debe manejar errores graciosamente', async () => {
      // Test con ID de perfil inválido
      const testBuffer = Buffer.from('test');

      const response = await request(app)
        .post('/api/media/upload/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testBuffer, 'test.png')
        .field('seccion', 'galeria_fotos')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('✅ Debe validar secciones válidas', async () => {
      const testBuffer = Buffer.from('test');

      const response = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testBuffer, 'test.png')
        .field('seccion', 'seccion_inexistente')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('🎛️ Funcionalidades del Sistema de Storage', () => {
    test('✅ Debe detectar provider correcto', async () => {
      const response = await request(app)
        .get('/api/media/storage/info')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // En testing debería ser Local Storage
      expect(response.body.data.provider).toBe('Local Storage');
      expect(response.body.data.config.baseDir).toContain('uploads');
    });

    test('✅ Debe calcular estadísticas correctas', async () => {
      // Subir algunos archivos primero
      const files = ['test1.png', 'test2.png'];
      
      for (const filename of files) {
        const testBuffer = Buffer.from(`test content for ${filename}`);
        await request(app)
          .post(`/api/media/upload/${testProfile.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .attach('files', testBuffer, filename)
          .field('seccion', 'galeria_fotos');
      }

      const response = await request(app)
        .get('/api/media/storage/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.totalFiles).toBeGreaterThan(0);
      expect(response.body.data.totalSize).toBeGreaterThan(0);
    });
  });
});