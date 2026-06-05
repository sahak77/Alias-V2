import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC transforms tests so NestJS decorators + reflect-metadata work under Vitest
// (the same emit path as the production build — see .swcrc). Vitest 4 transforms
// with Oxc by default; disable it so unplugin-swc is the sole transformer (Oxc does
// not emit the legacy decorator metadata NestJS DI relies on).
export default defineConfig({
  oxc: false,
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
      },
      module: { type: 'es6' },
    }),
  ],
  test: {
    environment: 'node',
    root: './',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
