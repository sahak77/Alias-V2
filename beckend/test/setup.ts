import 'reflect-metadata';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// Baseline env so any test that boots the Nest app passes boot-time validation
// (config/env.ts requires DATABASE_URL). No real DB connection is made — the pool
// is lazy and nothing queries it in these tests.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgres://alias:alias@localhost:5432/alias_test';
// A dummy key so the AnthropicProvider is selected; MSW intercepts the call so NO
// real provider request is made (PRs cost $0). Redis/R2 stay unconfigured ⇒ the
// budget reservation + content policy degrade to their safe stubs.
process.env.ANTHROPIC_API_KEY ??= 'test-anthropic-key';

// LLM is mocked by default (MSW). Live provider calls only in the gated nightly job.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
