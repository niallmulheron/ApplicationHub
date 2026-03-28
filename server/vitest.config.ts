import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/db/migrate.ts'],
    },
  },
  resolve: {
    // Resolve .js extensions to .ts (Node ESM pattern)
    extensions: ['.ts', '.js'],
  },
});
