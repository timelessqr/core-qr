// ====================================
// tests/integration/auth.test.js
// ====================================
const request = require('supertest');
const testSetup = require('../helpers/testSetup');

describe('🔐 Auth Module Integration Tests', () => {
  let app;
  let testPort;

  beforeAll(async () => {
    await testSetup.setupTestEnvironment();
    await testSetup.connectTestDatabase();
    await testSetup.cleanTestDatabase();
    testPort = await testSetup.startTestServer();
    
    // Crear app de testing
    app = require('../../server');
  });

  afterAll(async () => {
    await testSetup.fullCleanup();
  });

  beforeEach(async () => {
    await testSetup.cleanTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    test('✅ Debe registrar un nuevo usuario exitosamente', async () => {
      const userData = {
        nombre: 'Juan Test',
        email: 'juan.test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Usuario registrado exitosamente');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.nombre).toBe(userData.nombre);
      expect(response.body.data.user.password).toBeUndefined(); // No debe devolver password
      expect(response.body.data.token).toBeDefined();
    });

    test('❌ Debe fallar con email duplicado', async () => {
      const userData = {
        nombre: 'Juan Test',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // Primer registro
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Segundo registro con mismo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('El email ya está registrado');
    });

    test('❌ Debe fallar con datos inválidos', async () => {
      const invalidData = {
        nombre: '',
        email: 'invalid-email',
        password: '123' // Muy corta
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    let registeredUser;

    beforeEach(async () => {
      // Registrar usuario para testing
      const userData = {
        nombre: 'Test User',
        email: 'login.test@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      registeredUser = userData;
    });

    test('✅ Debe hacer login exitosamente', async () => {
      const loginData = {
        email: registeredUser.email,
        password: registeredUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login exitoso');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('❌ Debe fallar con credenciales incorrectas', async () => {
      const wrongCredentials = {
        email: registeredUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(wrongCredentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    test('❌ Debe fallar con usuario inexistente', async () => {
      const nonExistentUser = {
        email: 'noexiste@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nonExistentUser)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Registrar y autenticar usuario
      const userData = {
        nombre: 'Profile Test',
        email: 'profile.test@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
    });

    test('✅ Debe obtener perfil de usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe('profile.test@example.com');
      expect(response.body.data.password).toBeUndefined();
    });

    test('❌ Debe fallar sin token de autorización', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token no proporcionado');
    });

    test('❌ Debe fallar con token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('🔒 Middleware de autenticación', () => {
    test('✅ Debe permitir acceso con token válido', async () => {
      // Registrar usuario
      const userData = {
        nombre: 'Auth Test',
        email: 'auth.middleware@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      // Probar endpoint protegido
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('❌ Debe denegar acceso sin token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});