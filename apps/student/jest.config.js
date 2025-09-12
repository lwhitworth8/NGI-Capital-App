const tsJestPath = require.resolve('ts-jest')

module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  // Use a simple relative path to avoid Windows path resolution issues
  setupFilesAfterEnv: [],
  transform: {
    '^.+\\.(ts|tsx)$': [tsJestPath, { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
