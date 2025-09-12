module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/components/__tests__/student-nav.test.tsx'],
  setupFilesAfterEnv: [],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

