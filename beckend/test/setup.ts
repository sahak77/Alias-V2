import 'reflect-metadata';

// Baseline env so any test that boots the Nest app passes boot-time validation
// (config/env.ts requires DATABASE_URL). No real DB connection is made — the pool
// is lazy and nothing queries it in these tests.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgres://alias:alias@localhost:5432/alias_test';
