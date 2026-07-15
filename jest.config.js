/* global module */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['utils.js', 'domUtils.js', 'formHandler.js', 'modules/storage.js'],
  coverageReporters: ['text-summary', 'lcov'],
};
