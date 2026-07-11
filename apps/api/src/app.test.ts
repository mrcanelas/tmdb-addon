import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('@metalayer/api', () => {
  const appPromise = buildApp({ logger: false });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('responds to GET /api/v1/health', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: { 'x-correlation-id': 'test-corr-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe('test-corr-1');
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('metalayer-api');
    expect(body.version).toMatch(/^1\.0\.0-alpha\./);
    expect(body.correlationId).toBe('test-corr-1');
  });

  it('responds to GET /api/v1/ping', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/api/v1/ping' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.pong).toBe(true);
    expect(typeof body.correlationId).toBe('string');
  });

  it('returns structured ROUTE_NOT_FOUND for unknown paths', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/missing',
      headers: { 'x-correlation-id': 'missing-1' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'ROUTE_NOT_FOUND',
      correlationId: 'missing-1',
    });
  });
});
