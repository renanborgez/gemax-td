import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: [
      'src/lib/**/*.spec.ts',
      'src/engine/**/*.spec.ts',
      'src/world/**/*.spec.ts',
      'src/entities/**/*.spec.ts',
      'src/content/**/*.spec.ts',
      'src/difficulty/**/*.spec.ts',
      'src/meta/**/*.spec.ts',
    ],
    globals: true,
    environment: 'node',
    reporters: process.env['CI'] ? ['default'] : ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
