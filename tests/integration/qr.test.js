// ====================================
// tests/integration/qr.test.js
// ====================================
const request = require('supertest');
const testSetup = require('../helpers/testSetup');

describe('📱 QR Module Integration Tests', () => {
  let app;
  let authToken;
  let testProfile;
  let testQR;

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
      nombre: 'QR Test User',
      email: 'qr.test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;

    // Crear perfil
    const profileData = {
      nombre: 'QR Test Profile',
      apellido: 'Memorial',
      fechaNacimiento: '1950-01-01',
      fechaFallecimiento: '2020-01-01',
      biografia: 'Memorial para testing de QR'
    };

    const profileResponse = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${authToken}`)
      .send(profileData);

    testProfile = profileResponse.body.data.profile;
    testQR = profileResponse.body.data.qr; // Se genera automáticamente
  });

  describe('POST /api/qr/generate/:profileId', () => {
    test('✅ Debe generar un nuevo QR para un perfil', async () => {
      const response = await request(app)
        .post(`/api/qr/generate/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('generado exitosamente');
      expect(response.body.data.codigo).toBeDefined();
      expect(response.body.data.codigo).toHaveLength(12);
      expect(response.body.data.url).toContain('/memorial/');
      expect(response.body.data.imagenBase64).toBeDefined();
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .post(`/api/qr/generate/${testProfile.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar con perfil inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post(`/api/qr/generate/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/qr/my-qrs', () => {
    beforeEach(async () => {
      // Crear perfiles adicionales con QRs
      const profiles = [
        {
          nombre: 'Profile 1',
          apellido: 'Test',
          fechaNacimiento: '1950-01-01',
          fechaFallecimiento: '2020-01-01'
        },
        {
          nombre: 'Profile 2',
          apellido: 'Test',
          fechaNacimiento: '1955-01-01',
          fechaFallecimiento: '2021-01-01'
        }
      ];

      for (const profileData of profiles) {
        await request(app)
          .post('/api/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(profileData);
      }
    });

    test('✅ Debe obtener todos los QRs del usuario', async () => {
      const response = await request(app)
        .get('/api/qr/my-qrs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrs).toHaveLength(3); // testProfile + 2 adicionales
      expect(response.body.data.total).toBe(3);
      
      const firstQR = response.body.data.qrs[0];
      expect(firstQR.codigo).toBeDefined();
      expect(firstQR.perfil).toBeDefined();
      expect(firstQR.stats).toBeDefined();
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/qr/my-qrs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/qr/:code/stats', () => {
    test('✅ Debe obtener estadísticas de un QR', async () => {
      const response = await request(app)
        .get(`/api/qr/${testQR.codigo}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.codigo).toBe(testQR.codigo);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.vistas).toBeDefined();
      expect(response.body.data.stats.escaneos).toBeDefined();
      expect(typeof response.body.data.stats.vistas).toBe('number');
      expect(typeof response.body.data.stats.escaneos).toBe('number');
    });

    test('❌ Debe fallar con código inexistente', async () => {
      const response = await request(app)
        .get('/api/qr/CODIGOFAKE123/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/qr/${testQR.codigo}/stats`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/memorial/:qrCode (Público)', () => {
    test('✅ Debe acceder al memorial público sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/memorial/${testQR.codigo}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.perfil).toBeDefined();
      expect(response.body.data.perfil.nombre).toBe('QR Test Profile');
      expect(response.body.data.perfil.apellido).toBe('Memorial');
      expect(response.body.data.qr).toBeDefined();
      expect(response.body.data.qr.stats).toBeDefined();
    });

    test('✅ Debe incrementar las vistas al acceder', async () => {
      // Primera visita
      await request(app)
        .get(`/api/memorial/${testQR.codigo}`)
        .expect(200);

      // Segunda visita
      const response = await request(app)
        .get(`/api/memorial/${testQR.codigo}`)
        .expect(200);

      expect(response.body.data.qr.stats.vistas).toBeGreaterThan(0);
    });

    test('❌ Debe fallar con código inexistente', async () => {
      const response = await request(app)
        .get('/api/memorial/CODIGOINVALIDO')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('no válido');
    });

    test('✅ Debe rastrear escaneos vs vistas', async () => {
      // Simular escaneo (con header específico)
      const scanResponse = await request(app)
        .get(`/api/memorial/${testQR.codigo}`)
        .set('User-Agent', 'QR-Scanner')
        .expect(200);

      // Verificar que se registró como escaneo
      const statsResponse = await request(app)
        .get(`/api/qr/${testQR.codigo}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.data.stats.escaneos).toBeGreaterThan(0);
    });
  });

  describe('🔍 Funcionalidades de QR', () => {
    test('✅ Los códigos QR deben ser únicos', async () => {
      const codes = new Set();
      
      // Generar varios QRs
      for (let i = 0; i < 5; i++) {
        const profileData = {
          nombre: `Test ${i}`,
          apellido: 'Unique',
          fechaNacimiento: '1950-01-01',
          fechaFallecimiento: '2020-01-01'
        };

        const response = await request(app)
          .post('/api/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(profileData);

        const qrCode = response.body.data.qr.codigo;
        expect(codes.has(qrCode)).toBe(false); // No debe existir
        codes.add(qrCode);
      }
    });

    test('✅ Los QRs deben tener imagen base64 válida', async () => {
      const response = await request(app)
        .post(`/api/qr/generate/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const imageData = response.body.data.imagenBase64;
      expect(imageData).toBeDefined();
      expect(imageData).toMatch(/^data:image\/png;base64,/);
      
      // Verificar que es una imagen válida
      const base64Data = imageData.split(',')[1];
      expect(base64Data).toBeDefined();
      expect(base64Data.length).toBeGreaterThan(100); // Imagen válida debe tener contenido
    });

    test('✅ La URL del memorial debe ser accesible', async () => {
      const qrUrl = testQR.url;
      expect(qrUrl).toContain('/memorial/');
      expect(qrUrl).toContain(testQR.codigo);

      // Extraer código de la URL y verificar acceso
      const codeFromUrl = qrUrl.split('/memorial/')[1];
      
      const response = await request(app)
        .get(`/api/memorial/${codeFromUrl}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('📊 Estadísticas y Analytics', () => {
    test('✅ Debe rastrear múltiples tipos de interacciones', async () => {
      const qrCode = testQR.codigo;

      // Simular diferentes tipos de acceso
      await request(app).get(`/api/memorial/${qrCode}`); // Vista normal
      await request(app).get(`/api/memorial/${qrCode}`).set('User-Agent', 'QR-Scanner'); // Escaneo
      await request(app).get(`/api/memorial/${qrCode}`).set('Referer', 'https://whatsapp.com'); // Compartido

      const statsResponse = await request(app)
        .get(`/api/qr/${qrCode}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stats = statsResponse.body.data.stats;
      expect(stats.vistas).toBeGreaterThan(0);
      expect(stats.escaneos).toBeGreaterThan(0);
    });

    test('✅ Debe mantener histórico de estadísticas', async () => {
      const qrCode = testQR.codigo;

      // Primera consulta
      const firstStats = await request(app)
        .get(`/api/qr/${qrCode}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      const initialViews = firstStats.body.data.stats.vistas;

      // Generar más actividad
      await request(app).get(`/api/memorial/${qrCode}`);
      await request(app).get(`/api/memorial/${qrCode}`);

      // Segunda consulta
      const secondStats = await request(app)
        .get(`/api/qr/${qrCode}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      const finalViews = secondStats.body.data.stats.vistas;
      expect(finalViews).toBeGreaterThan(initialViews);
    });
  });
});