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

  it('POST /v1/generate maps the stub to the NOT_IMPLEMENTED envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/generate')
      .send({ theme: 'space exploration', locale: 'en' });
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_IMPLEMENTED' } });
  });

  it('POST /v1/generate with an invalid body returns the VALIDATION envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/generate')
      .send({ theme: '', locale: 'xx' });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('GET /v1/content-policy/:locale is wired and returns the NOT_IMPLEMENTED envelope', async () => {
    const res = await request(app.getHttpServer()).get('/v1/content-policy/en');
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_IMPLEMENTED' } });
  });
});
