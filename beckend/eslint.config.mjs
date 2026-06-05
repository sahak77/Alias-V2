import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'src/db/migrations/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Server source: Zod-only DTOs, structured logging only.
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'class-validator',
              message: 'Zod-only DTOs. Use @alias/contracts + createZodDto (nestjs-zod).',
            },
            {
              name: 'class-transformer',
              message: 'Zod-only DTOs. Use @alias/contracts + createZodDto (nestjs-zod).',
            },
          ],
        },
      ],
    },
  },
  {
    // normalize.ts is imported by the RN app — keep it RN-safe / dependency-free.
    files: ['src/infra/normalize.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                'node:*',
                'fs',
                'path',
                'crypto',
                'pg',
                'drizzle-orm',
                '@aws-sdk/*',
                '@upstash/*',
                '@opentelemetry/*',
                'pino',
                'nestjs-pino',
              ],
              message:
                'normalize.ts is shared with the RN app — keep it RN-safe (no server-only or Node built-in imports).',
            },
          ],
        },
      ],
    },
  },
  {
    // CLI scripts and pre-logger bootstrap may use console.
    files: ['src/db/seed.ts', 'src/infra/otel.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['test/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: { 'no-console': 'off' },
  },
);
