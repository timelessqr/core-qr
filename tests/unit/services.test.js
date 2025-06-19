// ====================================
// tests/unit/services.test.js
// ====================================
const testSetup = require('../helpers/testSetup');

describe('🧪 Unit Tests - Services', () => {
  beforeAll(async () => {
    await testSetup.setupTestEnvironment();
    await testSetup.connectTestDatabase();
  });

  afterAll(async () => {
    await testSetup.disconnectTestDatabase();
  });

  beforeEach(async () => {
    await testSetup.cleanTestDatabase();
  });

  describe('🔐 Auth Service', () => {
    let authService;

    beforeAll(() => {
      authService = require('../../src/modules/auth/services/authService');
    });

    test('✅ Debe validar email correctamente', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@domain.co.uk'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user space@domain.com'
      ];

      validEmails.forEach(email => {
        expect(authService.isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(authService.isValidEmail(email)).toBe(false);
      });
    });

    test('✅ Debe validar contraseña correctamente', () => {
      const validPasswords = [
        'password123',
        'MySecurePass!',
        'abcdef123456'
      ];

      const invalidPasswords = [
        '123',      // Muy corta
        'ab',       // Muy corta
        '',         // Vacía
        null,       // Null
        undefined   // Undefined
      ];

      validPasswords.forEach(password => {
        expect(authService.isValidPassword(password)).toBe(true);
      });

      invalidPasswords.forEach(password => {
        expect(authService.isValidPassword(password)).toBe(false);
      });
    });

    test('✅ Debe generar JWT token válido', () => {
      const userData = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      const token = authService.generateToken(userData);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    test('✅ Debe verificar JWT token válido', () => {
      const userData = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      const token = authService.generateToken(userData);
      const decoded = authService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(userData.id);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.exp).toBeDefined(); // Expiration time
    });

    test('❌ Debe fallar con token inválido', () => {
      const invalidTokens = [
        'invalid.token.here',
        'not-a-token',
        '',
        null,
        undefined
      ];

      invalidTokens.forEach(token => {
        expect(() => {
          authService.verifyToken(token);
        }).toThrow();
      });
    });
  });

  describe('📱 QR Service', () => {
    let qrService;

    beforeAll(() => {
      qrService = require('../../src/modules/qr/services/qrService');
    });

    test('✅ Debe generar código QR único', () => {
      const codes = new Set();
      
      for (let i = 0; i < 100; i++) {
        const code = qrService.generateUniqueCode();
        expect(code).toBeDefined();
        expect(typeof code).toBe('string');
        expect(code).toHaveLength(12);
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });

    test('✅ Debe validar formato de código QR', () => {
      const validCodes = [
        'ABCD1234EFGH',
        '1234567890AB',
        'ZZZZ0000YYYY'
      ];

      const invalidCodes = [
        'ABC123',        // Muy corto
        'ABCD1234EFGHIJ', // Muy largo
        'abcd1234efgh',   // Minúsculas
        'ABCD-1234-EFGH', // Con guiones
        '',               // Vacío
        null,             // Null
        undefined         // Undefined
      ];

      validCodes.forEach(code => {
        expect(qrService.isValidQRCode(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(qrService.isValidQRCode(code)).toBe(false);
      });
    });

    test('✅ Debe generar URL de memorial correcta', () => {
      const code = 'TEST12345678';
      const url = qrService.generateMemorialUrl(code);

      expect(url).toBeDefined();
      expect(url).toContain('/memorial/');
      expect(url).toContain(code);
      expect(url).toMatch(/^https?:\/\//); // Debe ser URL válida
    });

    test('✅ Debe detectar tipo de acceso correctamente', () => {
      const scannerUserAgent = 'QR-Scanner/1.0';
      const normalUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)';
      const whatsappReferer = 'https://whatsapp.com';

      expect(qrService.detectAccessType(scannerUserAgent, null)).toBe('scan');
      expect(qrService.detectAccessType(normalUserAgent, null)).toBe('view');
      expect(qrService.detectAccessType(normalUserAgent, whatsappReferer)).toBe('shared');
    });
  });

  describe('🎨 Dashboard Service', () => {
    let dashboardService;

    beforeAll(() => {
      dashboardService = require('../../src/modules/dashboard/services/dashboardService');
    });

    test('✅ Debe validar configuración de colores', () => {
      const validColors = [
        '#FF0000',
        '#00FF00',
        '#0000FF',
        '#ffffff',
        '#000000',
        '#123456',
        '#abc',
        '#ABC'
      ];

      const invalidColors = [
        'red',
        'FF0000',   // Sin #
        '#GGG',     // Caracteres inválidos
        '#FFFFFFF', // Muy largo
        '#FF',      // Muy corto
        '',
        null,
        undefined
      ];

      validColors.forEach(color => {
        expect(dashboardService.isValidHexColor(color)).toBe(true);
      });

      invalidColors.forEach(color => {
        expect(dashboardService.isValidHexColor(color)).toBe(false);
      });
    });

    test('✅ Debe generar CSS personalizado correctamente', () => {
      const config = {
        colorPrimario: '#2c3e50',
        colorSecundario: '#ffffff',
        colorAccento: '#3498db',
        fuente: 'sans-serif',
        tamanoFuente: 'mediano'
      };

      const css = dashboardService.generateCustomCSS(config);

      expect(css).toContain('--color-primary: #2c3e50');
      expect(css).toContain('--color-secondary: #ffffff');
      expect(css).toContain('--color-accent: #3498db');
      expect(css).toContain('Arial, sans-serif');
      expect(css).toContain('16px');
    });

    test('✅ Debe formatear nombres de sección correctamente', () => {
      const sectionMappings = {
        'biografia': 'Biografía',
        'galeria_fotos': 'Galería de Fotos',
        'videos_memoriales': 'Videos Memoriales',
        'cronologia': 'Cronología',
        'testimonios': 'Testimonios',
        'condolencias': 'Condolencias'
      };

      Object.entries(sectionMappings).forEach(([key, expected]) => {
        const formatted = dashboardService.formatSectionName(key);
        expect(formatted).toBe(expected);
      });
    });

    test('✅ Debe obtener iconos de sección correctamente', () => {
      const iconMappings = {
        'biografia': 'user',
        'galeria_fotos': 'image',
        'videos_memoriales': 'video',
        'cronologia': 'clock',
        'testimonios': 'quote',
        'condolencias': 'heart'
      };

      Object.entries(iconMappings).forEach(([section, expectedIcon]) => {
        const icon = dashboardService.getSectionIcon(section);
        expect(icon).toBe(expectedIcon);
      });
    });

    test('✅ Debe validar límites de secciones por plan', () => {
      const basicPlanSections = Array.from({length: 5}, (_, i) => ({
        tipo: `seccion_${i}`,
        activa: true
      }));

      const exceededPlanSections = Array.from({length: 7}, (_, i) => ({
        tipo: `seccion_${i}`,
        activa: true
      }));

      expect(dashboardService.validateSectionLimits(basicPlanSections, 'basico')).toBe(true);
      expect(dashboardService.validateSectionLimits(exceededPlanSections, 'basico')).toBe(false);
    });
  });

  describe('📁 Storage Service', () => {
    let storageService;

    beforeAll(() => {
      storageService = require('../../src/services/storage/storageService');
    });

    test('✅ Debe detectar configuración R2 correctamente', () => {
      // Guardar variables originales
      const originalR2Vars = {
        ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
        ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
        BUCKET_NAME: process.env.R2_BUCKET_NAME
      };

      // Test sin R2
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;

      expect(storageService.shouldUseR2()).toBe(false);

      // Test con R2 completo
      process.env.R2_ACCOUNT_ID = 'test_account';
      process.env.R2_ACCESS_KEY_ID = 'test_key';
      process.env.R2_SECRET_ACCESS_KEY = 'test_secret';
      process.env.R2_BUCKET_NAME = 'test_bucket';

      expect(storageService.shouldUseR2()).toBe(true);

      // Restaurar variables originales
      Object.entries(originalR2Vars).forEach(([key, value]) => {
        if (value !== undefined) {
          process.env[`R2_${key}`] = value;
        }
      });
    });

    test('✅ Debe obtener información del proveedor correctamente', () => {
      const providerInfo = storageService.getProviderInfo();

      expect(providerInfo).toBeDefined();
      expect(providerInfo.provider).toBeDefined();
      expect(providerInfo.features).toBeDefined();
      expect(providerInfo.config).toBeDefined();

      expect(['Cloudflare R2', 'Local Storage']).toContain(providerInfo.provider);
      expect(typeof providerInfo.features.presignedUrls).toBe('boolean');
      expect(typeof providerInfo.features.cdn).toBe('boolean');
    });
  });

  describe('🧮 Utils y Helpers', () => {
    describe('📅 Cálculo de edad', () => {
      test('✅ Debe calcular edad correctamente', () => {
        const calculateAge = require('../../src/utils/dateHelpers').calculateAge;

        const birthDate = new Date('1950-06-15');
        const deathDate = new Date('2023-06-14'); // Un día antes del cumpleaños

        const age = calculateAge(birthDate, deathDate);
        expect(age).toBe(72); // No había cumplido 73
      });

      test('✅ Debe manejar año bisiesto correctamente', () => {
        const calculateAge = require('../../src/utils/dateHelpers').calculateAge;

        const birthDate = new Date('2000-02-29'); // Año bisiesto
        const deathDate = new Date('2023-02-28'); // Día antes en año no bisiesto

        const age = calculateAge(birthDate, deathDate);
        expect(age).toBe(22); // No había cumplido 23
      });
    });

    describe('✅ Validadores', () => {
      const validators = require('../../src/utils/validators');

      test('✅ Debe validar ObjectId de MongoDB', () => {
        const validIds = [
          '507f1f77bcf86cd799439011',
          '507f191e810c19729de860ea'
        ];

        const invalidIds = [
          'invalid_id',
          '123',
          '',
          null,
          undefined
        ];

        validIds.forEach(id => {
          expect(validators.isValidObjectId(id)).toBe(true);
        });

        invalidIds.forEach(id => {
          expect(validators.isValidObjectId(id)).toBe(false);
        });
      });

      test('✅ Debe sanitizar entrada de texto', () => {
        const dangerousInputs = [
          '<script>alert("xss")</script>',
          'Normal text',
          'Text with <b>HTML</b> tags',
          '   Text with spaces   '
        ];

        const expectedOutputs = [
          'alert("xss")',
          'Normal text',
          'Text with HTML tags',
          'Text with spaces'
        ];

        dangerousInputs.forEach((input, index) => {
          const sanitized = validators.sanitizeText(input);
          expect(sanitized).toBe(expectedOutputs[index]);
        });
      });
    });

    describe('📊 Response Helper', () => {
      const responseHelper = require('../../src/utils/responseHelper');

      test('✅ Debe formatear respuesta exitosa', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        const data = { test: 'data' };
        const message = 'Success message';

        responseHelper.success(mockRes, data, message, 200);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message,
          data,
          timestamp: expect.any(String)
        });
      });

      test('✅ Debe formatear respuesta de error', () => {
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        const message = 'Error message';

        responseHelper.error(mockRes, message, 400);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message,
          timestamp: expect.any(String)
        });
      });
    });
  });
});