// ====================================
// tests/helpers/testSequencer.js
// ====================================
const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Ordenar tests para que se ejecuten en secuencia lógica
    const order = [
      'auth.test.js',
      'profiles.test.js', 
      'qr.test.js',
      'media.test.js',
      'storage.test.js',
      'dashboard.test.js',
      'services.test.js'
    ];

    const sortedTests = [];
    const remainingTests = [...tests];

    // Agregar tests en orden específico
    order.forEach(filename => {
      const testIndex = remainingTests.findIndex(test => 
        test.path.includes(filename)
      );
      
      if (testIndex !== -1) {
        sortedTests.push(remainingTests[testIndex]);
        remainingTests.splice(testIndex, 1);
      }
    });

    // Agregar tests restantes al final
    sortedTests.push(...remainingTests);

    return sortedTests;
  }
}

module.exports = CustomSequencer;