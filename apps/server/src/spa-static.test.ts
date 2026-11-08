import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

function makeSpaDist(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `metalayer-${label}-`));
  mkdirSync(join(root, 'static', 'js'), { recursive: true });
  writeFileSync(
    join(root, 'index.html'),
    `<!doctype html><html><body data-app="${label}">ok</body></html>\n`,
    'utf8',
  );
  writeFileSync(join(root, 'static', 'js', 'app.js'), `console.log("${label}");\n`, 'utf8');
  return root;
}

describe('@metalayer/server spa static', () => {
  const configureDist = makeSpaDist('configure');
  const adminDist = makeSpaDist('admin');

  const appPromise = buildApp({
    logger: false,
    encryptionKey: TEST_KEY,
    sqlitePath: ':memory:',
    configureDist,
    adminDist,
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it('redirects / to /configure/', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/configure/');
  });

  it('redirects /configure to /configure/', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/configure' });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/configure/');
  });

  it('serves configure index at /configure/', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/configure/' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.body).toContain('data-app="configure"');
  });

  it('serves configure SPA fallback for client routes', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'GET',
      url: '/configure/sources',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-app="configure"');
  });

  it('serves configure static assets', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'GET',
      url: '/configure/static/js/app.js',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('configure');
  });

  it('serves admin index at /admin/', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/admin/' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('data-app="admin"');
  });

  it('can require credentials for Admin HTML and assets behind a hosted proxy', async () => {
    const token = 'test-dashboard-token';
    const app = await buildApp({
      logger: false, encryptionKey: TEST_KEY, configureDist, adminDist,
      env: { METALAYER_ADMIN_BASIC_AUTH: 'true', METALAYER_DASHBOARD_TOKEN: token },
    });
    try {
      expect((await app.inject('/configure/')).statusCode).toBe(200);
      for (const url of ['/admin', '/admin/', '/admin/static/js/app.js']) {
        expect((await app.inject(url)).statusCode).toBe(401);
      }
      const response = await app.inject({
        url: '/admin/',
        headers: { authorization: `Basic ${Buffer.from(`operator:${token}`).toString('base64')}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
    } finally {
      await app.close();
    }
  });
});
