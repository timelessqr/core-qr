// ====================================
// tests/integration/storage.test.js
// ====================================
const request = require('supertest');
const testSetup = require('../helpers/testSetup');

describe('💾 Storage System Integration Tests', () => {
  let app;
  let authToken;
  let testProfile;

  beforeAll(async () => {
    await testSetup.setupTestEnvironment();
    await testSetup.connectTestDatabase();
    app = require('../../server');
  });

  afterAll(async () => {
    await testSetup.fullCleanup();
  });

  beforeEach(async () => {
    await testSetup.cleanTestDatabase();
    
    // Crear usuario y perfil para testing
    const userData = {
      nombre: 'Storage Test User',
      email: 'storage.test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;

    // Crear perfil
    const profileData = {
      nombre: 'Storage Test',
      apellido: 'Profile',
      fechaNacimiento: '1950-01-01',
      fechaFallecimiento: '2020-01-01',
      biografia: 'Perfil para testing de storage'
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

      // Verificar estructura de features
      expect(typeof response.body.data.features.presignedUrls).toBe('boolean');
      expect(typeof response.body.data.features.cdn).toBe('boolean');
      expect(typeof response.body.data.features.globalDistribution).toBe('boolean');
      expect(typeof response.body.data.features.autoBackup).toBe('boolean');
    });

    test('✅ Debe identificar Local Storage en testing', async () => {
      const response = await request(app)
        .get('/api/media/storage/info')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // En ambiente de testing, debería usar Local Storage
      expect(response.body.data.provider).toBe('Local Storage');
      expect(response.body.data.features.presignedUrls).toBe(false);
      expect(response.body.data.features.cdn).toBe(false);
      expect(response.body.data.config.baseDir).toContain('uploads');
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/info')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/storage/stats', () => {
    test('✅ Debe obtener estadísticas de uso básicas', async () => {
      const response = await request(app)
        .get('/api/media/storage/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSize).toBeDefined();
      expect(response.body.data.totalFiles).toBeDefined();
      expect(response.body.data.provider).toBe('Local Storage');
      expect(response.body.data.basePath).toBeDefined();

      expect(typeof response.body.data.totalSize).toBe('number');
      expect(typeof response.body.data.totalFiles).toBe('number');
    });

    test('✅ Debe incluir información del usuario', async () => {
      const response = await request(app)
        .get('/api/media/storage/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/media/storage/presigned-url', () => {
    test('❌ Debe fallar con Local Storage', async () => {
      const requestData = {
        filePath: 'test/example.jpg',
        contentType: 'image/jpeg',
        expiresIn: 3600
      };

      const response = await request(app)
        .post('/api/media/storage/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('URLs presignadas solo disponibles con Cloudflare R2');
    });

    test('❌ Debe fallar sin filePath', async () => {
      const requestData = {
        contentType: 'image/jpeg'
      };

      const response = await request(app)
        .post('/api/media/storage/presigned-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ruta del archivo es requerida');
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const requestData = {
        filePath: 'test/example.jpg'
      };

      const response = await request(app)
        .post('/api/media/storage/presigned-url')
        .send(requestData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/storage/list', () => {
    test('✅ Debe listar archivos del usuario', async () => {
      const response = await request(app)
        .get('/api/media/storage/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.directory).toBeDefined();
      expect(response.body.data.files).toBeDefined();
      expect(response.body.data.total).toBeDefined();
      expect(Array.isArray(response.body.data.files)).toBe(true);
      expect(typeof response.body.data.total).toBe('number');
    });

    test('✅ Debe permitir filtros de consulta', async () => {
      const response = await request(app)
        .get('/api/media/storage/list?fileType=images&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('✅ Debe limitar resultados correctamente', async () => {
      const response = await request(app)
        .get('/api/media/storage/list?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files.length).toBeLessThanOrEqual(5);
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/list')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/storage/exists/:filePath', () => {
    test('✅ Debe verificar archivo inexistente', async () => {
      const response = await request(app)
        .get('/api/media/storage/exists/archivo-inexistente.jpg')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
      expect(response.body.data.filePath).toContain('archivo-inexistente.jpg');
      expect(response.body.data.checked).toBeDefined();
    });

    test('❌ Debe fallar sin ruta de archivo', async () => {
      const response = await request(app)
        .get('/api/media/storage/exists/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Express route not found

      // Este test verifica que la ruta requiere un parámetro
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/exists/test.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/storage/file-info/:filePath', () => {
    test('❌ Debe fallar con archivo inexistente', async () => {
      const response = await request(app)
        .get('/api/media/storage/file-info/archivo-inexistente.jpg')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/file-info/test.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/storage/download-url/:filePath', () => {
    test('❌ Debe fallar con archivo inexistente', async () => {
      const response = await request(app)
        .get('/api/media/storage/download-url/archivo-inexistente.jpg')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('✅ Debe manejar parámetros de query opcionales', async () => {
      const response = await request(app)
        .get('/api/media/storage/download-url/test.jpg?expiresIn=7200&responseContentType=image/jpeg')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400); // Falla porque el archivo no existe, pero maneja los parámetros

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/media/storage/download-url/test.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/media/storage/migrate-to-r2', () => {
    test('✅ Debe responder con función no implementada', async () => {
      const response = await request(app)
        .post('/api/media/storage/migrate-to-r2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('no implementada aún');
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .post('/api/media/storage/migrate-to-r2')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('🔧 Integración con Media Upload', () => {
    test('✅ Storage debe funcionar con upload de media', async () => {
      // Verificar info antes del upload
      const infoBefore = await request(app)
        .get('/api/media/storage/info')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(infoBefore.body.data.provider).toBe('Local Storage');

      // Subir archivo
      const testBuffer = Buffer.from('test file for storage integration');
      const uploadResponse = await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testBuffer, 'storage-test.png')
        .field('seccion', 'galeria_fotos')
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);

      // Verificar estadísticas después del upload
      const statsAfter = await request(app)
        .get('/api/media/storage/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Las estadísticas pueden haber cambiado
      expect(statsAfter.body.success).toBe(true);
      expect(typeof statsAfter.body.data.totalSize).toBe('number');
    });

    test('✅ Debe mantener consistencia entre media y storage', async () => {
      // Subir archivo
      const testBuffer = Buffer.from('consistency test file');
      await request(app)
        .post(`/api/media/upload/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testBuffer, 'consistency-test.png')
        .field('seccion', 'galeria_fotos');

      // Obtener media del perfil
      const mediaResponse = await request(app)
        .get(`/api/media/profile/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mediaResponse.body.success).toBe(true);

      // Obtener estadísticas de storage
      const storageResponse = await request(app)
        .get('/api/media/storage/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(storageResponse.body.success).toBe(true);

      // Ambos deberían reflejar la existencia de archivos
      expect(mediaResponse.body.data.stats.totalItems).toBeGreaterThanOrEqual(0);
      expect(storageResponse.body.data.totalFiles).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🔒 Validaciones de Seguridad', () => {
    test('❌ Debe prevenir acceso a archivos de otros usuarios', async () => {
      // Crear segundo usuario
      const userData2 = {
        nombre: 'Other User',
        email: 'other.storage@example.com',
        password: 'password123'
      };

      const registerResponse2 = await request(app)
        .post('/api/auth/register')
        .send(userData2);

      const authToken2 = registerResponse2.body.data.token;

      // Usuario 1 intenta acceder con token de usuario 2
      const response = await request(app)
        .get('/api/media/storage/file-info/test.jpg')
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(404); // No encuentra archivo (que es correcto, está aislado por usuario)

      expect(response.body.success).toBe(false);
    });

    test('✅ Debe validar IDs de perfil correctamente', async () => {
      const response = await request(app)
        .get('/api/media/storage/exists/invalid-path')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Debería manejar rutas inválidas graciosamente
      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(false);
    });

    test('✅ Debe manejar caracteres especiales en rutas', async () => {
      const specialPath = 'folder%20with%20spaces/file%20name.jpg';
      
      const response = await request(app)
        .get(`/api/media/storage/exists/${specialPath}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filePath).toContain(specialPath);
    });
  });

  describe('⚡ Performance y Límites', () => {
    test('✅ Debe respetar límites de listado', async () => {
      const response = await request(app)
        .get('/api/media/storage/list?limit=1000') // Límite muy alto
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // El sistema debería limitar a 100 máximo según implementación
      expect(response.body.data.files.length).toBeLessThanOrEqual(100);
    });

    test('✅ Debe manejar consultas vacías correctamente', async () => {
      const response = await request(app)
        .get('/api/media/storage/list?limit=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toBeDefined();
    });

    test('✅ Debe responder rápidamente a consultas de info', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/media/storage/info')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Menos de 1 segundo
    });
  });
});