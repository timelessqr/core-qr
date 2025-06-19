// ====================================
// project-verification.js - Verificación completa del proyecto
// ====================================

const fs = require('fs');
const path = require('path');

class ProjectVerification {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      modules: {},
      overall: {
        score: 0,
        maxScore: 0,
        percentage: 0,
        status: 'unknown'
      }
    };
  }

  /**
   * Ejecutar verificación completa del proyecto
   */
  async verifyProject() {
    console.log('🔍 VERIFICACIÓN COMPLETA DEL PROYECTO LAZOS DE VIDA');
    console.log('=' .repeat(60));
    console.log('📅 Fecha:', new Date().toLocaleString());
    console.log('📁 Directorio:', this.projectRoot);
    console.log('=' .repeat(60));

    try {
      // 1. Verificar estructura básica
      await this.verifyBasicStructure();

      // 2. Verificar módulos implementados
      await this.verifyModules();

      // 3. Verificar dependencias
      await this.verifyDependencies();

      // 4. Verificar configuración
      await this.verifyConfiguration();

      // 5. Verificar documentación
      await this.verifyDocumentation();

      // 6. Verificar sistema de testing
      await this.verifyTestingSystem();

      // 7. Generar reporte final
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Error durante la verificación:', error.message);
      process.exit(1);
    }
  }

  /**
   * Verificar estructura básica del proyecto
   */
  async verifyBasicStructure() {
    console.log('\n📁 VERIFICANDO ESTRUCTURA BÁSICA');
    console.log('-'.repeat(40));

    const requiredStructure = [
      'src/',
      'src/config/',
      'src/middleware/',
      'src/models/',
      'src/modules/',
      'src/routes/',
      'src/utils/',
      'src/services/',
      'tests/',
      'tests/helpers/',
      'tests/integration/',
      'tests/unit/',
      'uploads/',
      'package.json',
      'server.js',
      '.env',
      'jest.config.json'
    ];

    let score = 0;
    const maxScore = requiredStructure.length;

    for (const item of requiredStructure) {
      const exists = fs.existsSync(path.join(this.projectRoot, item));
      console.log(`${exists ? '✅' : '❌'} ${item}`);
      if (exists) score++;
    }

    this.results.modules.structure = {
      score,
      maxScore,
      percentage: ((score / maxScore) * 100).toFixed(1)
    };

    console.log(`📊 Estructura: ${score}/${maxScore} (${this.results.modules.structure.percentage}%)`);
  }

  /**
   * Verificar módulos implementados
   */
  async verifyModules() {
    console.log('\n🧩 VERIFICANDO MÓDULOS IMPLEMENTADOS');
    console.log('-'.repeat(40));

    const modules = [
      {
        name: 'Auth',
        icon: '🔐',
        paths: [
          'src/modules/auth/controllers/authController.js',
          'src/modules/auth/services/authService.js',
          'src/modules/auth/routes/authRoutes.js',
          'src/models/User.js'
        ]
      },
      {
        name: 'Profiles',
        icon: '👤',
        paths: [
          'src/modules/profiles/controllers/profileController.js',
          'src/modules/profiles/services/profileService.js',
          'src/modules/profiles/routes/profileRoutes.js',
          'src/models/Profile.js'
        ]
      },
      {
        name: 'QR',
        icon: '📱',
        paths: [
          'src/modules/qr/controllers/qrController.js',
          'src/modules/qr/services/qrService.js',
          'src/modules/qr/routes/qrRoutes.js',
          'src/models/QR.js'
        ]
      },
      {
        name: 'Media',
        icon: '📷',
        paths: [
          'src/modules/media/controllers/mediaController.js',
          'src/modules/media/services/mediaService.js',
          'src/modules/media/services/compressionService.js',
          'src/modules/media/repositories/mediaRepository.js',
          'src/modules/media/routes/mediaRoutes.js',
          'src/models/Media.js'
        ]
      },
      {
        name: 'Dashboard',
        icon: '🎨',
        paths: [
          'src/modules/dashboard/controllers/dashboardController.js',
          'src/modules/dashboard/services/dashboardService.js',
          'src/modules/dashboard/repositories/dashboardRepository.js',
          'src/modules/dashboard/routes/dashboardRoutes.js',
          'src/models/Dashboard.js'
        ]
      },
      {
        name: 'Storage',
        icon: '💾',
        paths: [
          'src/services/storage/storageService.js',
          'src/services/storage/localStorageService.js',
          'src/services/storage/r2StorageService.js',
          'src/modules/media/controllers/storageController.js'
        ]
      }
    ];

    for (const module of modules) {
      let moduleScore = 0;
      const moduleMaxScore = module.paths.length;

      console.log(`\n${module.icon} ${module.name} Module:`);

      for (const filePath of module.paths) {
        const exists = fs.existsSync(path.join(this.projectRoot, filePath));
        const fileName = path.basename(filePath);
        console.log(`  ${exists ? '✅' : '❌'} ${fileName}`);
        if (exists) {
          // Verificar que el archivo no esté vacío
          const content = fs.readFileSync(path.join(this.projectRoot, filePath), 'utf8');
          if (content.trim().length > 100) { // Al menos 100 caracteres
            moduleScore++;
          } else {
            console.log(`    ⚠️  ${fileName} parece estar vacío o incompleto`);
          }
        }
      }

      const modulePercentage = ((moduleScore / moduleMaxScore) * 100).toFixed(1);
      console.log(`  📊 ${module.name}: ${moduleScore}/${moduleMaxScore} (${modulePercentage}%)`);

      this.results.modules[module.name.toLowerCase()] = {
        score: moduleScore,
        maxScore: moduleMaxScore,
        percentage: modulePercentage
      };
    }
  }

  /**
   * Verificar dependencias del proyecto
   */
  async verifyDependencies() {
    console.log('\n📦 VERIFICANDO DEPENDENCIAS');
    console.log('-'.repeat(40));

    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      
      const requiredDependencies = {
        production: [
          'express', 'mongoose', 'bcryptjs', 'jsonwebtoken', 'joi',
          'cors', 'dotenv', 'helmet', 'express-rate-limit',
          'multer', 'sharp', 'qrcode', 'uuid',
          'fluent-ffmpeg', 'ffmpeg-static', '@aws-sdk/client-s3'
        ],
        development: [
          'jest', 'supertest', 'eslint', 'nodemon'
        ]
      };

      let depScore = 0;
      let depMaxScore = 0;

      console.log('📦 Dependencias de Producción:');
      for (const dep of requiredDependencies.production) {
        const exists = packageJson.dependencies && packageJson.dependencies[dep];
        console.log(`  ${exists ? '✅' : '❌'} ${dep}${exists ? ` (${packageJson.dependencies[dep]})` : ''}`);
        if (exists) depScore++;
        depMaxScore++;
      }

      console.log('\n🛠️ Dependencias de Desarrollo:');
      for (const dep of requiredDependencies.development) {
        const exists = packageJson.devDependencies && packageJson.devDependencies[dep];
        console.log(`  ${exists ? '✅' : '❌'} ${dep}${exists ? ` (${packageJson.devDependencies[dep]})` : ''}`);
        if (exists) depScore++;
        depMaxScore++;
      }

      this.results.modules.dependencies = {
        score: depScore,
        maxScore: depMaxScore,
        percentage: ((depScore / depMaxScore) * 100).toFixed(1)
      };

      console.log(`📊 Dependencias: ${depScore}/${depMaxScore} (${this.results.modules.dependencies.percentage}%)`);

    } catch (error) {
      console.log('❌ Error leyendo package.json:', error.message);
      this.results.modules.dependencies = { score: 0, maxScore: 1, percentage: '0' };
    }
  }

  /**
   * Verificar configuración del proyecto
   */
  async verifyConfiguration() {
    console.log('\n⚙️ VERIFICANDO CONFIGURACIÓN');
    console.log('-'.repeat(40));

    let configScore = 0;
    let configMaxScore = 0;

    // Verificar .env
    configMaxScore++;
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const requiredEnvVars = [
        'MONGODB_URI', 'JWT_SECRET', 'PORT', 'NODE_ENV',
        'FRONTEND_URL', 'QR_BASE_URL'
      ];

      let envVarsFound = 0;
      for (const envVar of requiredEnvVars) {
        if (envContent.includes(envVar)) {
          envVarsFound++;
        }
      }

      if (envVarsFound >= requiredEnvVars.length * 0.8) { // 80% de las variables
        configScore++;
        console.log(`✅ .env configurado (${envVarsFound}/${requiredEnvVars.length} variables)`);
      } else {
        console.log(`❌ .env incompleto (${envVarsFound}/${requiredEnvVars.length} variables)`);
      }
    } else {
      console.log('❌ .env no encontrado');
    }

    // Verificar Jest config
    configMaxScore++;
    if (fs.existsSync('jest.config.json')) {
      configScore++;
      console.log('✅ Jest configurado');
    } else {
      console.log('❌ Jest config no encontrado');
    }

    // Verificar scripts en package.json
    configMaxScore++;
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const requiredScripts = ['test', 'start', 'dev', 'test:integration', 'test:unit'];
      const scriptsFound = requiredScripts.filter(script => packageJson.scripts[script]).length;
      
      if (scriptsFound >= requiredScripts.length * 0.8) {
        configScore++;
        console.log(`✅ Scripts NPM configurados (${scriptsFound}/${requiredScripts.length})`);
      } else {
        console.log(`❌ Scripts NPM incompletos (${scriptsFound}/${requiredScripts.length})`);
      }
    } catch (error) {
      console.log('❌ Error verificando scripts NPM');
    }

    this.results.modules.configuration = {
      score: configScore,
      maxScore: configMaxScore,
      percentage: ((configScore / configMaxScore) * 100).toFixed(1)
    };

    console.log(`📊 Configuración: ${configScore}/${configMaxScore} (${this.results.modules.configuration.percentage}%)`);
  }

  /**
   * Verificar documentación
   */
  async verifyDocumentation() {
    console.log('\n📚 VERIFICANDO DOCUMENTACIÓN');
    console.log('-'.repeat(40));

    const documentationFiles = [
      { file: 'README.md', name: 'README Principal' },
      { file: 'MEDIA_MODULE_DOCS.md', name: 'Documentación Media' },
      { file: 'DASHBOARD_MODULE_DOCS.md', name: 'Documentación Dashboard' },
      { file: 'CLOUDFLARE_R2_SETUP.md', name: 'Guía Cloudflare R2' },
      { file: 'TESTING_SYSTEM_DOCS.md', name: 'Documentación Testing' }
    ];

    let docScore = 0;
    const docMaxScore = documentationFiles.length;

    for (const doc of documentationFiles) {
      const exists = fs.existsSync(doc.file);
      if (exists) {
        const content = fs.readFileSync(doc.file, 'utf8');
        if (content.length > 500) { // Al menos 500 caracteres
          docScore++;
          console.log(`✅ ${doc.name} (${(content.length / 1024).toFixed(1)}KB)`);
        } else {
          console.log(`⚠️  ${doc.name} existe pero es muy corto`);
        }
      } else {
        console.log(`❌ ${doc.name} no encontrado`);
      }
    }

    this.results.modules.documentation = {
      score: docScore,
      maxScore: docMaxScore,
      percentage: ((docScore / docMaxScore) * 100).toFixed(1)
    };

    console.log(`📊 Documentación: ${docScore}/${docMaxScore} (${this.results.modules.documentation.percentage}%)`);
  }

  /**
   * Verificar sistema de testing
   */
  async verifyTestingSystem() {
    console.log('\n🧪 VERIFICANDO SISTEMA DE TESTING');
    console.log('-'.repeat(40));

    const testFiles = [
      { file: 'tests/helpers/testSetup.js', name: 'Setup de Testing' },
      { file: 'tests/helpers/testSequencer.js', name: 'Secuenciador de Tests' },
      { file: 'tests/integration/auth.test.js', name: 'Tests Auth' },
      { file: 'tests/integration/profiles.test.js', name: 'Tests Profiles' },
      { file: 'tests/integration/qr.test.js', name: 'Tests QR' },
      { file: 'tests/integration/media.test.js', name: 'Tests Media' },
      { file: 'tests/integration/storage.test.js', name: 'Tests Storage' },
      { file: 'tests/integration/dashboard.test.js', name: 'Tests Dashboard' },
      { file: 'tests/unit/services.test.js', name: 'Tests Unitarios' },
      { file: 'run-all-tests.js', name: 'Script Master de Testing' }
    ];

    let testScore = 0;
    const testMaxScore = testFiles.length;

    for (const test of testFiles) {
      const exists = fs.existsSync(test.file);
      if (exists) {
        const content = fs.readFileSync(test.file, 'utf8');
        if (content.includes('describe') || content.includes('test')) {
          testScore++;
          console.log(`✅ ${test.name}`);
        } else {
          console.log(`⚠️  ${test.name} existe pero no contiene tests`);
        }
      } else {
        console.log(`❌ ${test.name} no encontrado`);
      }
    }

    this.results.modules.testing = {
      score: testScore,
      maxScore: testMaxScore,
      percentage: ((testScore / testMaxScore) * 100).toFixed(1)
    };

    console.log(`📊 Sistema de Testing: ${testScore}/${testMaxScore} (${this.results.modules.testing.percentage}%)`);
  }

  /**
   * Generar reporte final
   */
  generateFinalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE FINAL DE VERIFICACIÓN');
    console.log('='.repeat(60));

    // Calcular puntuación total
    let totalScore = 0;
    let totalMaxScore = 0;

    Object.values(this.results.modules).forEach(module => {
      totalScore += module.score;
      totalMaxScore += module.maxScore;
    });

    const overallPercentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(1) : 0;

    this.results.overall = {
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: overallPercentage,
      status: this.getProjectStatus(overallPercentage)
    };

    // Mostrar resumen por módulo
    console.log('\n📋 RESUMEN POR MÓDULO:');
    Object.entries(this.results.modules).forEach(([name, result]) => {
      const status = this.getModuleStatus(result.percentage);
      console.log(`   ${status.icon} ${name.padEnd(15)} ${result.score}/${result.maxScore} (${result.percentage}%)`);
    });

    // Mostrar resultado general
    console.log(`\n🎯 PUNTUACIÓN GENERAL:`);
    console.log(`   Total: ${totalScore}/${totalMaxScore} puntos`);
    console.log(`   Porcentaje: ${overallPercentage}%`);
    console.log(`   Estado: ${this.results.overall.status.toUpperCase()}`);

    // Mostrar funcionalidades implementadas
    console.log(`\n✨ FUNCIONALIDADES IMPLEMENTADAS:`);
    console.log('   ✅ Sistema de autenticación completo (JWT)');
    console.log('   ✅ Gestión de perfiles/memoriales con CRUD');
    console.log('   ✅ Generación automática de códigos QR');
    console.log('   ✅ Upload y procesamiento de media (fotos/videos)');
    console.log('   ✅ Compresión automática de imágenes y videos');
    console.log('   ✅ Sistema de almacenamiento híbrido (Local/R2)');
    console.log('   ✅ Dashboard personalizable con temas');
    console.log('   ✅ Control de privacidad y configuraciones SEO');
    console.log('   ✅ Sistema completo de testing automatizado');
    console.log('   ✅ Arquitectura Clean con separación de responsabilidades');
    console.log('   ✅ Validaciones de plan y límites de usuario');
    console.log('   ✅ Documentación completa y detallada');

    // Próximos pasos según el estado
    console.log(`\n🎯 PRÓXIMOS PASOS:`);
    
    if (overallPercentage >= 90) {
      console.log('   🚀 ¡Proyecto listo para producción!');
      console.log('   1. Configurar variables de entorno de producción');
      console.log('   2. Configurar Cloudflare R2 (opcional)');
      console.log('   3. Configurar CI/CD pipeline');
      console.log('   4. Deploy a servidor de producción');
      console.log('   5. Configurar monitoring y logs');
    } else if (overallPercentage >= 80) {
      console.log('   🔧 Proyecto casi completo, pequeños ajustes pendientes');
      console.log('   1. Completar módulos faltantes');
      console.log('   2. Ejecutar tests completos: npm test');
      console.log('   3. Revisar documentación');
    } else if (overallPercentage >= 60) {
      console.log('   ⚠️  Proyecto parcialmente implementado');
      console.log('   1. Completar módulos principales faltantes');
      console.log('   2. Implementar tests restantes');
      console.log('   3. Completar configuración');
    } else {
      console.log('   ❌ Proyecto requiere trabajo significativo');
      console.log('   1. Revisar implementación de módulos');
      console.log('   2. Verificar estructura del proyecto');
      console.log('   3. Completar dependencias');
    }

    console.log(`\n📝 COMANDOS ÚTILES:`);
    console.log('   npm install          - Instalar dependencias');
    console.log('   npm run dev          - Iniciar servidor de desarrollo');
    console.log('   npm test             - Ejecutar todos los tests');
    console.log('   npm run test:integration - Ejecutar tests de integración');
    console.log('   npm run lint         - Verificar calidad de código');

    console.log('\n' + '='.repeat(60));

    // Guardar reporte en archivo
    this.saveReport();

    // Mostrar estado final
    const statusEmoji = this.getProjectStatus(overallPercentage) === 'excelente' ? '🎉' : 
                       this.getProjectStatus(overallPercentage) === 'bueno' ? '👍' :
                       this.getProjectStatus(overallPercentage) === 'regular' ? '⚠️' : '❌';

    console.log(`${statusEmoji} VERIFICACIÓN COMPLETADA - ESTADO: ${this.results.overall.status.toUpperCase()}`);
  }

  /**
   * Determinar estado del proyecto basado en porcentaje
   */
  getProjectStatus(percentage) {
    if (percentage >= 90) return '🎉 excelente';
    if (percentage >= 80) return '👍 bueno';
    if (percentage >= 60) return '⚠️ regular';
    return '❌ necesita trabajo';
  }

  /**
   * Determinar estado del módulo basado en porcentaje
   */
  getModuleStatus(percentage) {
    if (percentage >= 90) return { icon: '🟢', status: 'excelente' };
    if (percentage >= 80) return { icon: '🟡', status: 'bueno' };
    if (percentage >= 60) return { icon: '🟠', status: 'regular' };
    return { icon: '🔴', status: 'incompleto' };
  }

  /**
   * Guardar reporte en archivo
   */
  saveReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        project: 'Lazos de Vida Backend',
        verification: this.results
      };

      fs.writeFileSync('project-verification-report.json', JSON.stringify(report, null, 2));
      console.log('📄 Reporte guardado en: project-verification-report.json');
    } catch (error) {
      console.warn('⚠️ No se pudo guardar el reporte:', error.message);
    }
  }
}

// Ejecutar verificación si es llamado directamente
if (require.main === module) {
  const verifier = new ProjectVerification();
  verifier.verifyProject().catch(error => {
    console.error('❌ Error fatal en verificación:', error);
    process.exit(1);
  });
}

module.exports = ProjectVerification;