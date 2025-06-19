// ====================================
// run-all-tests.js - Script master para ejecutar todos los tests
// ====================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: []
    };
    this.startTime = Date.now();
  }

  /**
   * Ejecutar todos los tests del proyecto
   */
  async runAllTests() {
    console.log('🧪 LAZOS DE VIDA - SUITE COMPLETO DE TESTING');
    console.log('=============================================\n');

    try {
      // 1. Verificar dependencias
      await this.checkTestDependencies();

      // 2. Verificar configuración del proyecto
      await this.checkProjectSetup();

      // 3. Ejecutar tests de integración
      await this.runIntegrationTests();

      // 4. Ejecutar tests unitarios
      await this.runUnitTests();

      // 5. Generar reporte final
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Error ejecutando tests:', error.message);
      process.exit(1);
    }
  }

  /**
   * Verificar que las dependencias de testing estén instaladas
   */
  async checkTestDependencies() {
    console.log('📦 Verificando dependencias de testing...');

    const requiredDeps = ['jest', 'supertest'];
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);

    if (missingDeps.length > 0) {
      console.log('❌ Dependencias faltantes:', missingDeps.join(', '));
      console.log('💡 Instalar con: npm install --save-dev jest supertest');
      
      // Intentar instalar automáticamente
      console.log('🔄 Instalando dependencias automáticamente...');
      await this.runCommand('npm', ['install', '--save-dev', 'jest', 'supertest']);
    }

    console.log('✅ Dependencias de testing verificadas\n');
  }

  /**
   * Verificar configuración del proyecto
   */
  async checkProjectSetup() {
    console.log('🔧 Verificando configuración del proyecto...');

    const requiredFiles = [
      './src/models/User.js',
      './src/models/Profile.js',
      './src/models/QR.js',
      './src/models/Media.js',
      './src/models/Dashboard.js',
      './server.js',
      './.env'
    ];

    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

    if (missingFiles.length > 0) {
      console.log('❌ Archivos faltantes:', missingFiles.join(', '));
      throw new Error('Configuración del proyecto incompleta');
    }

    console.log('✅ Configuración del proyecto verificada\n');
  }

  /**
   * Ejecutar tests de integración
   */
  async runIntegrationTests() {
    console.log('🔗 EJECUTANDO TESTS DE INTEGRACIÓN');
    console.log('==================================');

    const integrationTests = [
      'tests/integration/auth.test.js',
      'tests/integration/profiles.test.js',
      'tests/integration/qr.test.js',
      'tests/integration/dashboard.test.js'
    ];

    for (const testFile of integrationTests) {
      if (fs.existsSync(testFile)) {
        console.log(`\n🧪 Ejecutando: ${testFile}`);
        await this.runJestTest(testFile);
      } else {
        console.log(`⚠️  Test no encontrado: ${testFile}`);
      }
    }
  }

  /**
   * Ejecutar tests unitarios
   */
  async runUnitTests() {
    console.log('\n🔬 EJECUTANDO TESTS UNITARIOS');
    console.log('=============================');

    const unitTests = [
      'tests/unit/services.test.js'
    ];

    for (const testFile of unitTests) {
      if (fs.existsSync(testFile)) {
        console.log(`\n🧪 Ejecutando: ${testFile}`);
        await this.runJestTest(testFile);
      } else {
        console.log(`⚠️  Test no encontrado: ${testFile}`);
      }
    }
  }

  /**
   * Ejecutar test individual con Jest
   */
  async runJestTest(testFile) {
    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', testFile, '--verbose', '--detectOpenHandles'], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      jest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      jest.on('close', (code) => {
        // Parsear resultados de Jest
        this.parseJestOutput(output, testFile);

        if (code === 0) {
          console.log(`✅ ${testFile} - PASADO`);
          resolve();
        } else {
          console.log(`❌ ${testFile} - FALLIDO (código: ${code})`);
          // No rechazar para que continúen otros tests
          resolve();
        }
      });

      jest.on('error', (error) => {
        console.error(`❌ Error ejecutando ${testFile}:`, error.message);
        resolve(); // Continuar con otros tests
      });
    });
  }

  /**
   * Parsear output de Jest para extraer estadísticas
   */
  parseJestOutput(output, testFile) {
    try {
      // Buscar patrones en el output de Jest
      const passMatch = output.match(/(\d+) passing/);
      const failMatch = output.match(/(\d+) failing/);
      const skipMatch = output.match(/(\d+) pending/);
      const timeMatch = output.match(/Time:\s+(\d+\.?\d*)\s*s/);

      const suite = {
        file: testFile,
        passed: passMatch ? parseInt(passMatch[1]) : 0,
        failed: failMatch ? parseInt(failMatch[1]) : 0,
        skipped: skipMatch ? parseInt(skipMatch[1]) : 0,
        duration: timeMatch ? parseFloat(timeMatch[1]) : 0
      };

      this.testResults.suites.push(suite);
      this.testResults.passed += suite.passed;
      this.testResults.failed += suite.failed;
      this.testResults.skipped += suite.skipped;
      this.testResults.total += suite.passed + suite.failed + suite.skipped;
      this.testResults.duration += suite.duration;

    } catch (error) {
      console.warn('⚠️  No se pudo parsear output de Jest');
    }
  }

  /**
   * Generar reporte final
   */
  generateFinalReport() {
    const endTime = Date.now();
    const totalDuration = (endTime - this.startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORTE FINAL DE TESTING');
    console.log('='.repeat(60));

    console.log(`\n📈 ESTADÍSTICAS GENERALES:`);
    console.log(`   Total de tests: ${this.testResults.total}`);
    console.log(`   ✅ Pasados: ${this.testResults.passed}`);
    console.log(`   ❌ Fallidos: ${this.testResults.failed}`);
    console.log(`   ⏭️  Omitidos: ${this.testResults.skipped}`);
    console.log(`   ⏱️  Duración total: ${totalDuration.toFixed(2)}s`);

    const successRate = this.testResults.total > 0 
      ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(2)
      : 0;

    console.log(`   📊 Tasa de éxito: ${successRate}%`);

    console.log(`\n📋 DETALLE POR SUITE:`);
    this.testResults.suites.forEach(suite => {
      const total = suite.passed + suite.failed + suite.skipped;
      const rate = total > 0 ? ((suite.passed / total) * 100).toFixed(1) : 0;
      const status = suite.failed === 0 ? '✅' : '❌';
      
      console.log(`   ${status} ${suite.file}`);
      console.log(`      Pasados: ${suite.passed}, Fallidos: ${suite.failed}, Omitidos: ${suite.skipped}`);
      console.log(`      Éxito: ${rate}%, Duración: ${suite.duration.toFixed(2)}s`);
    });

    // Evaluación general
    console.log(`\n🎯 EVALUACIÓN GENERAL:`);
    
    if (this.testResults.failed === 0 && this.testResults.passed > 0) {
      console.log('🎉 ¡TODOS LOS TESTS PASARON! El sistema está funcionando correctamente.');
    } else if (this.testResults.failed > 0) {
      console.log(`⚠️  ${this.testResults.failed} test(s) fallaron. Revisar los errores arriba.`);
    } else {
      console.log('🤔 No se ejecutaron tests. Verificar configuración.');
    }

    console.log(`\n💡 PRÓXIMOS PASOS:`);
    if (this.testResults.failed > 0) {
      console.log('1. 🔍 Revisar logs de errores');
      console.log('2. 🛠️  Corregir problemas identificados');
      console.log('3. 🔄 Re-ejecutar tests');
    } else {
      console.log('1. 🚀 Continuar con desarrollo');
      console.log('2. 📦 Preparar para deployment');
      console.log('3. 🔄 Configurar CI/CD');
    }

    console.log(`\n📝 COMANDOS ÚTILES:`);
    console.log('   npm test              - Ejecutar todos los tests');
    console.log('   npm run test:unit     - Solo tests unitarios');
    console.log('   npm run test:integration - Solo tests de integración');
    console.log('   npm run test:watch    - Tests en modo watch');

    console.log('\n' + '='.repeat(60));

    // Guardar reporte en archivo
    this.saveReportToFile();

    // Exit code basado en resultados
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }

  /**
   * Guardar reporte en archivo
   */
  saveReportToFile() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total: this.testResults.total,
          passed: this.testResults.passed,
          failed: this.testResults.failed,
          skipped: this.testResults.skipped,
          duration: this.testResults.duration,
          successRate: this.testResults.total > 0 
            ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(2)
            : 0
        },
        suites: this.testResults.suites
      };

      const reportPath = './test-results.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Reporte guardado en: ${reportPath}`);

    } catch (error) {
      console.warn('⚠️  No se pudo guardar el reporte:', error.message);
    }
  }

  /**
   * Ejecutar comando de shell
   */
  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'inherit', shell: true });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Comando falló con código: ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;