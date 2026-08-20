const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
    globalSetup: ['./test/globalSetup.mjs'],
    testTimeout: 30000,
    // First run downloads a MongoDB binary for mongodb-memory-server, which can
    // take well over the default timeout on a cold cache (notably in CI).
    hookTimeout: 180000,
  },
});
