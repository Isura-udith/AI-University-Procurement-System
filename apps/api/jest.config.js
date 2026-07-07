/**
 * Jest Configuration
 * Sets up the Node.js test environment and restricts test execution to the tests/ directory.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
