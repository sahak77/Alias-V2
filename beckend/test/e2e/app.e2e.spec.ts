import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

// End-to-end wiring smoke test: boots the real Nest pipeline (global ZodValidationPipe
// + error-envelope filter via APP_PIPE/APP_FILTER) and proves the stub maps to the
// shared error envelope. This is the cheapest proof the whole boot chain works.
describe('App (e2e) — wiring smoke test', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /v1/generate returns a validated, deduped, capped WordCard[] chunk', async () => {
    // MSW returns 30 cards (incl. a duplicate + an invalid one); the pipeline
    // Zod-re-validates, dedupes, and caps to `count`.
    const res = await request(app.getHttpServer())
      .post('/v1/generate')
      .send({ theme: 'space exploration', locale: 'en', count: 25 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.cards)).toBe(true);
    expect(res.body.cards).toHaveLength(25);
    expect(res.body.meta).toMatchObject({ promptVersion: expect.any(String), model: expect.any(String) });
  });

  it('POST /v1/generate with an invalid body returns the VALIDATION envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/generate')
      .send({ theme: '', locale: 'xx' });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('GET /v1/content-policy/:locale serves the empty (permissive) policy when R2 is unconfigured', async () => {
    // No R2_PUBLIC_BASE_URL in the test env ⇒ the read path degrades softly to a
    // permissive policy rather than failing — content delivery never gates.
    const res = await request(app.getHttpServer()).get('/v1/content-policy/en');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ locale: 'en', version: 0, blocklist: [] });
  });

  it('GET /v1/content-policy/:locale rejects a malformed locale with the VALIDATION envelope', async () => {
    const res = await request(app.getHttpServer()).get('/v1/content-policy/x');
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });
});
