import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: {
    '@morewax/dsh-prime-memory': resolve('packages/dsh-prime-memory/src/index.ts'),
    '@morewax/dsh-okf-knowledge': resolve('packages/dsh-okf-knowledge/src/index.ts'),
  } },
  test: {
    include: ['packages/**/tests/**/*.spec.ts', 'packages/*/src/**/*.spec.ts'],
    environment: 'node',
  },
})
