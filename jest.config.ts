import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/__tests__/**/*.{ts,tsx}'],
  // Component tests share JSDOM and React Query work; restricting parallelism
  // keeps legitimate async assertions from timing out under CI load.
  maxWorkers: '50%',
  testTimeout: 10_000,
}

export default createJestConfig(config)
