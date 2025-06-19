// ====================================
// tests/helpers/testSetup.js
// ====================================
const mongoose = require('mongoose');

class TestSetup {
  constructor() {
    this.testDbName = 'lazos-de-vida-test';
    this.testUser = null;
    this.testProfile = null;
    this.authToken = null;
    this.server = null;
  }

  /**
   * Configurar entorno de testing
   */
  async setupTestEnvironment() {
    try {
      // Configurar variables de entorno de test
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_URI = `mongodb://localhost:27017/${this.testDbName}`;
      process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
      process.env.JWT_EXPIRES_IN = '1h';

      console.log('✅ Variables de entorno configuradas para testing');
      return true;
    } catch (error) {
      console.error('❌ Error configurando entorno:', error);
      return false;
    }
  }

  /**
   * Conectar a base de datos de testing
   */
  async connectTestDatabase() {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
      }
      
      console.log(`✅ Conectado a BD de testing: ${this.testDbName}`);
      return true;
    } catch (error) {
      console.error('❌ Error conectando a BD de testing:', error);
      return false;
    }
  }

  /**
   * Limpiar base de datos de testing
   */
  async cleanTestDatabase() {
    try {
      if (mongoose.connection.readyState === 1) {
        const collections = await mongoose.connection.db.collections();
        
        for (const collection of collections) {
          await collection.deleteMany({});
        }
        
        console.log('✅ Base de datos de testing limpiada');
      }
      return true;
    } catch (error) {
      console.error('❌ Error limpiando BD de testing:', error);
      return false;
    }
  }

  /**
   * Desconectar base de datos de testing
   */
  async disconnectTestDatabase() {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('✅ Desconectado de BD de testing');
      }
      return true;
    } catch (error) {
      console.error('❌ Error desconectando BD de testing:', error);
      return false;
    }
  }

  /**
   * Crear usuario de testing
   */
  async createTestUser() {
    try {
      const User = require('../../src/models/User');
      const bcrypt = require('bcryptjs');

      const hashedPassword = await bcrypt.hash('testpassword123', 12);
      
      this.testUser = await User.create({
        nombre: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        plan: 'basico'
      });

      console.log(`✅ Usuario de testing creado: ${this.testUser.email}`);
      return this.testUser;
    } catch (error) {
      console.error('❌ Error creando usuario de testing:', error);
      throw error;
    }
  }

  /**
   * Crear perfil de testing
   */
  async createTestProfile() {
    try {
      const Profile = require('../../src/models/Profile');

      this.testProfile = await Profile.create({
        nombre: 'Juan Test',
        apellido: 'Pérez Test',
        fechaNacimiento: new Date('1950-01-01'),
        fechaFallecimiento: new Date('2020-01-01'),
        biografia: 'Biografía de testing para las pruebas unitarias',
        usuario: this.testUser._id
      });

      console.log(`✅ Perfil de testing creado: ${this.testProfile.nombre}`);
      return this.testProfile;
    } catch (error) {
      console.error('❌ Error creando perfil de testing:', error);
      throw error;
    }
  }

  /**
   * Generar token de autenticación
   */
  async generateAuthToken() {
    try {
      const jwt = require('jsonwebtoken');

      this.authToken = jwt.sign(
        { 
          id: this.testUser._id,
          email: this.testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      console.log('✅ Token de autenticación generado');
      return this.authToken;
    } catch (error) {
      console.error('❌ Error generando token:', error);
      throw error;
    }
  }

  /**
   * Inicializar servidor de testing
   */
  async startTestServer() {
    try {
      const app = require('../../server');
      
      return new Promise((resolve) => {
        this.server = app.listen(0, () => { // Puerto 0 = puerto aleatorio
          const port = this.server.address().port;
          console.log(`✅ Servidor de testing iniciado en puerto ${port}`);
          resolve(port);
        });
      });
    } catch (error) {
      console.error('❌ Error iniciando servidor de testing:', error);
      throw error;
    }
  }

  /**
   * Detener servidor de testing
   */
  async stopTestServer() {
    try {
      if (this.server) {
        return new Promise((resolve) => {
          this.server.close(() => {
            console.log('✅ Servidor de testing detenido');
            resolve();
          });
        });
      }
    } catch (error) {
      console.error('❌ Error deteniendo servidor:', error);
      throw error;
    }
  }

  /**
   * Setup completo para testing
   */
  async fullSetup() {
    try {
      await this.setupTestEnvironment();
      await this.connectTestDatabase();
      await this.cleanTestDatabase();
      await this.createTestUser();
      await this.createTestProfile();
      await this.generateAuthToken();
      
      console.log('🎉 Setup completo de testing realizado');
      
      return {
        user: this.testUser,
        profile: this.testProfile,
        token: this.authToken,
        dbName: this.testDbName
      };
    } catch (error) {
      console.error('❌ Error en setup completo:', error);
      throw error;
    }
  }

  /**
   * Cleanup completo después de testing
   */
  async fullCleanup() {
    try {
      await this.stopTestServer();
      await this.cleanTestDatabase();
      await this.disconnectTestDatabase();
      
      console.log('🧹 Cleanup completo de testing realizado');
    } catch (error) {
      console.error('❌ Error en cleanup:', error);
      throw error;
    }
  }

  /**
   * Obtener headers de autenticación para requests
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generar datos de testing aleatorios
   */
  generateRandomTestData() {
    const random = Math.random().toString(36).substring(7);
    
    return {
      user: {
        nombre: `Test User ${random}`,
        email: `test.${random}@example.com`,
        password: 'testpassword123'
      },
      profile: {
        nombre: `Juan ${random}`,
        apellido: `Pérez ${random}`,
        fechaNacimiento: new Date('1950-01-01'),
        fechaFallecimiento: new Date('2020-01-01'),
        biografia: `Biografía de testing ${random}`
      }
    };
  }

  /**
   * Verificar que las dependencias de testing estén disponibles
   */
  checkTestDependencies() {
    const dependencies = ['jest', 'supertest'];
    const missing = [];

    dependencies.forEach(dep => {
      try {
        require.resolve(dep);
      } catch (error) {
        missing.push(dep);
      }
    });

    if (missing.length > 0) {
      console.warn(`⚠️  Dependencias de testing faltantes: ${missing.join(', ')}`);
      console.log('Instalar con: npm install --save-dev jest supertest');
      return false;
    }

    console.log('✅ Todas las dependencias de testing están disponibles');
    return true;
  }
}

module.exports = new TestSetup();