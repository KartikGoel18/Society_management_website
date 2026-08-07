export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/tests/**', '!src/seed/**']
};
