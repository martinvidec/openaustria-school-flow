import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: [
      'src/**/*.spec.ts',
      'src/**/*.e2e-spec.ts',
      'test/**/*.spec.ts',
      'test/**/*.e2e-spec.ts',
      'prisma/__tests__/**/*.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
