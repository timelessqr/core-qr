// ====================================
// tests/integration/dashboard.test.js
// ====================================
const request = require('supertest');
const testSetup = require('../helpers/testSetup');

describe('🎨 Dashboard Module Integration Tests', () => {
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
      nombre: 'Dashboard Test User',
      email: 'dashboard.test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;

    // Crear perfil
    const profileData = {
      nombre: 'Dashboard Test',
      apellido: 'Profile',
      fechaNacimiento: '1950-01-01',
      fechaFallecimiento: '2020-01-01',
      biografia: 'Perfil para testing de dashboard'
    };

    const profileResponse = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${authToken}`)
      .send(profileData);

    testProfile = profileResponse.body.data.profile;
  });

  describe('GET /api/dashboard/templates', () => {
    test('✅ Debe obtener templates disponibles sin autenticación', async () => {
      const response = await request(app)
        .get('/api/dashboard/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.temas).toBeDefined();
      expect(response.body.data.secciones).toBeDefined();
      expect(Array.isArray(response.body.data.temas)).toBe(true);
      expect(Array.isArray(response.body.data.secciones)).toBe(true);

      // Verificar estructura de temas
      const tema = response.body.data.temas[0];
      expect(tema.id).toBeDefined();
      expect(tema.nombre).toBeDefined();
      expect(tema.descripcion).toBeDefined();

      // Verificar estructura de secciones
      const seccion = response.body.data.secciones[0];
      expect(seccion.id).toBeDefined();
      expect(seccion.nombre).toBeDefined();
      expect(seccion.descripcion).toBeDefined();
      expect(seccion.icono).toBeDefined();
    });
  });

  describe('GET /api/dashboard/:profileId', () => {
    test('✅ Debe obtener o crear dashboard por defecto', async () => {
      const response = await request(app)
        .get(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
      expect(response.body.data.dashboard.secciones).toBeDefined();
      expect(response.body.data.dashboard.configuracion).toBeDefined();
      expect(response.body.data.dashboard.privacidad).toBeDefined();
      expect(response.body.data.dashboard.seo).toBeDefined();

      // Verificar configuración por defecto
      const config = response.body.data.dashboard.configuracion;
      expect(config.tema).toBe('clasico');
      expect(config.colorPrimario).toBe('#333333');
      expect(config.permitirCondolencias).toBe(true);
    });

    test('❌ Debe fallar sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/dashboard/${testProfile.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/dashboard/:profileId', () => {
    test('✅ Debe crear dashboard por defecto explícitamente', async () => {
      const response = await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.secciones).toBeDefined();
      expect(response.body.data.data.secciones.length).toBeGreaterThan(0);

      // Verificar secciones por defecto
      const biografiaSection = response.body.data.data.secciones.find(s => s.tipo === 'biografia');
      expect(biografiaSection).toBeDefined();
      expect(biografiaSection.activa).toBe(true);
      expect(biografiaSection.orden).toBe(0);
    });

    test('❌ Debe fallar si ya existe dashboard', async () => {
      // Crear dashboard primero
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Intentar crear otro
      const response = await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Ya existe un dashboard');
    });
  });

  describe('PUT /api/dashboard/:profileId/config', () => {
    beforeEach(async () => {
      // Crear dashboard para testing
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('✅ Debe actualizar configuración general', async () => {
      const configUpdate = {
        tema: 'moderno',
        colorPrimario: '#2c3e50',
        colorSecundario: '#ffffff',
        colorAccento: '#3498db',
        fuente: 'sans-serif',
        tamanoFuente: 'grande',
        permitirCondolencias: false,
        efectosAnimacion: true
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/config`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(configUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const config = response.body.data.data.configuracion;
      expect(config.tema).toBe('moderno');
      expect(config.colorPrimario).toBe('#2c3e50');
      expect(config.permitirCondolencias).toBe(false);
      expect(config.efectosAnimacion).toBe(true);
    });

    test('❌ Debe fallar con tema inválido', async () => {
      const invalidConfig = {
        tema: 'tema_inexistente'
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/config`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Tema no válido');
    });

    test('❌ Debe fallar con color inválido', async () => {
      const invalidConfig = {
        colorPrimario: 'not-a-color'
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/config`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('color hexadecimal válido');
    });
  });

  describe('PUT /api/dashboard/:profileId/theme', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('✅ Debe cambiar tema correctamente', async () => {
      const themeData = {
        tema: 'elegante',
        configuracion: {
          colorPrimario: '#1a1a1a',
          colorAccento: '#d4af37'
        }
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/theme`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(themeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const config = response.body.data.data.configuracion;
      expect(config.tema).toBe('elegante');
      expect(config.colorPrimario).toBe('#1a1a1a');
      expect(config.colorAccento).toBe('#d4af37');
    });

    test('❌ Debe fallar sin especificar tema', async () => {
      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/theme`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('tema es requerido');
    });
  });

  describe('PUT /api/dashboard/:profileId/sections', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('✅ Debe actualizar secciones correctamente', async () => {
      const sectionsData = {
        secciones: [
          {
            tipo: 'biografia',
            activa: true,
            orden: 0,
            contenido: {
              titulo: 'Su Historia Personal',
              descripcion: 'La vida de una persona extraordinaria'
            },
            configuracion: {
              tipo: 'text',
              mostrarTitulos: true
            }
          },
          {
            tipo: 'galeria_fotos',
            activa: true,
            orden: 1,
            contenido: {
              titulo: 'Galería de Recuerdos',
              descripcion: 'Momentos capturados para la eternidad'
            },
            configuracion: {
              tipo: 'grid',
              columnas: 4,
              mostrarTitulos: false
            }
          },
          {
            tipo: 'condolencias',
            activa: false,
            orden: 2
          }
        ]
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(sectionsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const secciones = response.body.data.data.secciones;
      expect(secciones).toHaveLength(3);
      
      const biografia = secciones.find(s => s.tipo === 'biografia');
      expect(biografia.contenido.titulo).toBe('Su Historia Personal');
      expect(biografia.configuracion.tipo).toBe('text');
      
      const galeria = secciones.find(s => s.tipo === 'galeria_fotos');
      expect(galeria.configuracion.columnas).toBe(4);
      
      const condolencias = secciones.find(s => s.tipo === 'condolencias');
      expect(condolencias.activa).toBe(false);
    });

    test('❌ Debe fallar con tipo de sección inválido', async () => {
      const invalidSections = {
        secciones: [
          {
            tipo: 'seccion_inexistente',
            activa: true,
            orden: 0
          }
        ]
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSections)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Tipo de sección no válido');
    });

    test('❌ Debe fallar si se excede límite del plan', async () => {
      // Crear demasiadas secciones activas para plan básico (límite: 5)
      const tooManySections = {
        secciones: [
          { tipo: 'biografia', activa: true, orden: 0 },
          { tipo: 'galeria_fotos', activa: true, orden: 1 },
          { tipo: 'videos_memoriales', activa: true, orden: 2 },
          { tipo: 'cronologia', activa: true, orden: 3 },
          { tipo: 'testimonios', activa: true, orden: 4 },
          { tipo: 'logros', activa: true, orden: 5 }, // Excede límite
          { tipo: 'hobbies', activa: true, orden: 6 }
        ]
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/sections`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(tooManySections)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Su plan permite máximo');
    });
  });

  describe('PUT /api/dashboard/:profileId/privacy', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('✅ Debe actualizar configuración de privacidad', async () => {
      const privacyConfig = {
        publico: false,
        requierePassword: true,
        password: 'memorial123',
        mensajeBienvenida: 'Memorial privado de la familia'
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/privacy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(privacyConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const privacy = response.body.data.data.privacidad;
      expect(privacy.publico).toBe(false);
      expect(privacy.requierePassword).toBe(true);
      expect(privacy.mensajeBienvenida).toBe('Memorial privado de la familia');
    });

    test('✅ Debe configurar memorial público', async () => {
      const publicConfig = {
        publico: true,
        requierePassword: false,
        mensajeBienvenida: 'Bienvenidos al memorial de Juan'
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/privacy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publicConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const privacy = response.body.data.data.privacidad;
      expect(privacy.publico).toBe(true);
      expect(privacy.requierePassword).toBe(false);
    });
  });

  describe('PUT /api/dashboard/:profileId/seo', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('✅ Debe actualizar configuración SEO', async () => {
      const seoConfig = {
        titulo: 'Memorial Juan Pérez - Recuerdos Eternos',
        descripcion: 'Memorial digital dedicado a la memoria de Juan Pérez. Un hombre extraordinario que vivió una vida llena de amor.',
        palabrasClave: ['memorial', 'juan perez', 'recuerdos', 'familia', 'homenaje']
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/seo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(seoConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const seo = response.body.data.data.seo;
      expect(seo.titulo).toBe(seoConfig.titulo);
      expect(seo.descripcion).toBe(seoConfig.descripcion);
      expect(seo.palabrasClave).toEqual(seoConfig.palabrasClave);
    });

    test('✅ Debe truncar campos que exceden límites', async () => {
      const longSeoConfig = {
        titulo: 'Este es un título muy largo que excede los 60 caracteres permitidos para SEO',
        descripcion: 'Esta es una descripción extremadamente larga que definitivamente excede los 160 caracteres permitidos para la meta descripción de SEO y debería ser truncada automáticamente',
        palabrasClave: ['palabra1', 'palabra2', 'palabra3', 'palabra4', 'palabra5', 'palabra6', 'palabra7', 'palabra8', 'palabra9', 'palabra10', 'palabra11'] // 11 palabras, límite 10
      };

      const response = await request(app)
        .put(`/api/dashboard/${testProfile.id}/seo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(longSeoConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const seo = response.body.data.data.seo;
      expect(seo.titulo.length).toBeLessThanOrEqual(60);
      expect(seo.descripcion.length).toBeLessThanOrEqual(160);
      expect(seo.palabrasClave.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/dashboard/public/:profileId', () => {
    beforeEach(async () => {
      // Crear dashboard público
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Configurar como público
      await request(app)
        .put(`/api/dashboard/${testProfile.id}/privacy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ publico: true });
    });

    test('✅ Debe obtener configuración pública sin autenticación', async () => {
      const response = await request(app)
        .get(`/api/dashboard/public/${testProfile.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.perfil).toBeDefined();
      expect(response.body.data.secciones).toBeDefined();
      expect(response.body.data.configuracion).toBeDefined();
      expect(response.body.data.css).toBeDefined();

      // Verificar que solo incluye información pública
      expect(response.body.data.configuracion.tema).toBeDefined();
      expect(response.body.data.configuracion.colorPrimario).toBeDefined();
      
      // No debe incluir información privada
      expect(response.body.data.privacidad).toBeUndefined();
    });

    test('❌ Debe fallar si el memorial es privado', async () => {
      // Configurar como privado
      await request(app)
        .put(`/api/dashboard/${testProfile.id}/privacy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ publico: false });

      const response = await request(app)
        .get(`/api/dashboard/public/${testProfile.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('memorial es privado');
    });
  });

  describe('🔧 Funcionalidades Avanzadas', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/dashboard/${testProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('✅ Preview de configuración', async () => {
      const previewConfig = {
        configuracion: {
          tema: 'moderno',
          colorPrimario: '#ff6b6b'
        },
        secciones: [
          {
            tipo: 'biografia',
            activa: true,
            orden: 0
          }
        ]
      };

      const response = await request(app)
        .post(`/api/dashboard/${testProfile.id}/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(previewConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.configuracion).toBeDefined();
      expect(response.body.data.css).toBeDefined();
      expect(response.body.data.css).toContain('#ff6b6b');
    });

    test('✅ Export de configuración', async () => {
      const response = await request(app)
        .get(`/api/dashboard/${testProfile.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar headers de descarga
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');

      // Verificar estructura del export
      expect(response.body.version).toBeDefined();
      expect(response.body.exportDate).toBeDefined();
      expect(response.body.dashboard).toBeDefined();
      expect(response.body.dashboard.secciones).toBeDefined();
      expect(response.body.dashboard.configuracion).toBeDefined();
    });

    test('✅ Reset a configuración por defecto', async () => {
      // Primero modificar la configuración
      await request(app)
        .put(`/api/dashboard/${testProfile.id}/config`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tema: 'elegante', colorPrimario: '#ff0000' });

      // Luego resetear
      const response = await request(app)
        .post(`/api/dashboard/${testProfile.id}/reset`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const config = response.body.data.data.configuracion;
      expect(config.tema).toBe('clasico'); // Valor por defecto
      expect(config.colorPrimario).toBe('#333333'); // Valor por defecto
    });
  });
});