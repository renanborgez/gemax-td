import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Dedicated config for `npm run validate:waves`. Includes only the validator
// driver under scripts/, so the table prints once with no other tests in the
// run. The driver wraps its logic in a single vitest `it()` to reuse the
// existing `@/` alias resolver without pulling in another runner like ts-node.
export default defineConfig({
  test: {
    include: ['scripts/validate-waves.driver.ts'],
    globals: true,
    environment: 'node',
    reporters: ['basic'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
  },
});
