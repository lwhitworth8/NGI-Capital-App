const path = require('path')

const additionalNodePaths = [
  path.join(__dirname, 'node_modules'),
  path.join(__dirname, '..', '..', 'node_modules'),
]

process.env.NODE_PATH = additionalNodePaths
  .concat(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [])
  .filter(Boolean)
  .join(path.delimiter)

require('module').Module._initPaths()

const transformerPath = require.resolve('./src/jest-transformer.js')

module.exports = {
  rootDir: __dirname,
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/../../node_modules'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules', '<rootDir>/../../node_modules'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
  transform: {
    '^.+\\.(t|j)sx?$': transformerPath,
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^canvas$': '<rootDir>/__mocks__/canvasMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|@radix-ui)/)',
  ],
};
