// ====================================
// tests/integration/profiles.test.js
// ====================================
const request = require('supertest');
const testSetup = require('../helpers/testSetup');

describe('👤 Profiles Module Integration Tests', () => {
  let app;
  let authToken;
  let userId;
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
    
    // Crear usuario y obtener token para cada test
    const userData = {
      nombre: 'Profile Test User',
      email: 'profiles.test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  describe('POST /api/profiles', () => {
    test('✅ Debe crear un perfil exitosamente', async () => {
      const profileData = {
        nombre: 'Juan Carlos',
        apellido: 'Pérez García',
        fechaNacimiento: '1950-05-15',
        fechaFallecimiento: '2023-12-01',
        biografia: 'Una vida llena de amor y dedicación a la familia.'
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Memorial creado exitosamente');
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.nombre).toBe(profileData.nombre);
      expect(response.body.data.profile.apellido).toBe(profileData.apellido);
      expect(response.body.data.profile.edadAlFallecer).toBe(73);
      expect(response.body.data.qr).toBeDefined();
      expect(response.body.data.qr.codigo).toBeDefined();
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const profileData = {
        nombre: 'Test',
        apellido: 'User',
        fechaNacimiento: '1950-01-01',
        fechaFallecimiento: '2020-01-01'
      };

      const response = await request(app)
        .post('/api/profiles')
        .send(profileData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar con datos incompletos', async () => {
      const incompleteData = {
        nombre: 'Juan'
        // Falta apellido, fechas, etc.
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar con fechas inválidas', async () => {
      const invalidDates = {
        nombre: 'Juan',
        apellido: 'Pérez',
        fechaNacimiento: '2020-01-01',
        fechaFallecimiento: '1950-01-01' // Fecha de fallecimiento antes de nacimiento
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/profiles/my-profiles', () => {
    beforeEach(async () => {
      // Crear algunos perfiles para testing
      const profilesData = [
        {
          nombre: 'Juan',
          apellido: 'Pérez',
          fechaNacimiento: '1950-01-01',
          fechaFallecimiento: '2020-01-01',
          biografia: 'Biografía de Juan'
        },
        {
          nombre: 'María',
          apellido: 'González',
          fechaNacimiento: '1955-03-10',
          fechaFallecimiento: '2021-05-20',
          biografia: 'Biografía de María'
        }
      ];

      for (const profileData of profilesData) {
        await request(app)
          .post('/api/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(profileData);
      }
    });

    test('✅ Debe obtener todos los perfiles del usuario', async () => {
      const response = await request(app)
        .get('/api/profiles/my-profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].nombre).toBeDefined();
      expect(response.body.data[0].qr).toBeDefined();
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get('/api/profiles/my-profiles')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/profiles/:id', () => {
    beforeEach(async () => {
      // Crear perfil para testing
      const profileData = {
        nombre: 'Test Profile',
        apellido: 'For Getting',
        fechaNacimiento: '1960-01-01',
        fechaFallecimiento: '2022-01-01',
        biografia: 'Perfil para testing de obtención'
      };

      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData);

      testProfile = createResponse.body.data.profile;
    });

    test('✅ Debe obtener un perfil específico', async () => {
      const response = await request(app)
        .get(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProfile.id);
      expect(response.body.data.nombre).toBe('Test Profile');
      expect(response.body.data.apellido).toBe('For Getting');
    });

    test('❌ Debe fallar con ID inválido', async () => {
      const response = await request(app)
        .get('/api/profiles/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('❌ Debe fallar con perfil inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/profiles/:id', () => {
    beforeEach(async () => {
      // Crear perfil para testing
      const profileData = {
        nombre: 'Original Name',
        apellido: 'Original Apellido',
        fechaNacimiento: '1950-01-01',
        fechaFallecimiento: '2020-01-01',
        biografia: 'Biografía original'
      };

      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData);

      testProfile = createResponse.body.data.profile;
    });

    test('✅ Debe actualizar un perfil exitosamente', async () => {
      const updateData = {
        nombre: 'Updated Name',
        biografia: 'Biografía actualizada con nueva información'
      };

      const response = await request(app)
        .put(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nombre).toBe('Updated Name');
      expect(response.body.data.biografia).toBe('Biografía actualizada con nueva información');
      expect(response.body.data.apellido).toBe('Original Apellido'); // No cambiado
    });

    test('❌ Debe fallar al actualizar perfil de otro usuario', async () => {
      // Crear otro usuario
      const otherUserData = {
        nombre: 'Other User',
        email: 'other@example.com',
        password: 'password123'
      };

      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.token;

      const updateData = {
        nombre: 'Hacked Name'
      };

      const response = await request(app)
        .put(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    beforeEach(async () => {
      // Crear perfil para testing
      const profileData = {
        nombre: 'To Delete',
        apellido: 'Profile',
        fechaNacimiento: '1950-01-01',
        fechaFallecimiento: '2020-01-01',
        biografia: 'Perfil para eliminar'
      };

      const createResponse = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData);

      testProfile = createResponse.body.data.profile;
    });

    test('✅ Debe eliminar un perfil exitosamente', async () => {
      const response = await request(app)
        .delete(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Memorial eliminado');

      // Verificar que realmente se eliminó
      await request(app)
        .get(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('❌ Debe fallar al eliminar perfil de otro usuario', async () => {
      // Crear otro usuario
      const otherUserData = {
        nombre: 'Other User',
        email: 'other.delete@example.com',
        password: 'password123'
      };

      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .delete(`/api/profiles/${testProfile.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('🔍 Validaciones de negocio', () => {
    test('✅ Debe calcular correctamente la edad al fallecer', async () => {
      const profileData = {
        nombre: 'Age Test',
        apellido: 'User',
        fechaNacimiento: '1950-06-15',
        fechaFallecimiento: '2023-06-14' // Un día antes del cumpleaños
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(201);

      expect(response.body.data.profile.edadAlFallecer).toBe(72); // No había cumplido 73
    });

    test('✅ Debe generar QR automáticamente', async () => {
      const profileData = {
        nombre: 'QR Test',
        apellido: 'User',
        fechaNacimiento: '1950-01-01',
        fechaFallecimiento: '2020-01-01'
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(201);

      expect(response.body.data.qr).toBeDefined();
      expect(response.body.data.qr.codigo).toHaveLength(12);
      expect(response.body.data.qr.url).toContain('/memorial/');
    });
  });
});