import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Flat config for the shared contracts package.
// The load-bearing rule here is the IMPORT BOUNDARY: contracts must stay
// framework/DB/infra-free and RN-safe so the mobile app can import it.
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                'nestjs-zod',
                'fastify',
                'pino',
                'nestjs-pino',
                'drizzle-orm',
                'drizzle-orm/*',
                'pg',
                'postgres',
                '@upstash/*',
                'ioredis',
                'redis',
                '@aws-sdk/*',
                '@opentelemetry/*',
                '@sentry/*',
                'langfuse',
                'node:*',
                'fs',
                'path',
                'crypto',
                'os',
                'http',
                'https',
                'stream',
              ],
              message:
                'contracts must stay framework/DB/infra-free and RN-safe (no server-only or Node built-in imports).',
            },
          ],
        },
      ],
    },
  },
);
