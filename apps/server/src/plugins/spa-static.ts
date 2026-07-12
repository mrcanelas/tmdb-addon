import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyStatic from '@fastify/static';

export interface SpaStaticOptions {
  /** Absolute path to configure SPA dist (apps/frontend/dist). */
  configureRoot?: string;
  /** Absolute path to admin SPA dist (apps/dashboard/dist). */
  adminRoot?: string;
}

function defaultMonorepoRoot(): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  // apps/server/{src|dist}/plugins → monorepo root
  return resolve(here, '../../../..');
}

function resolveSpaRoot(
  envKey: string,
  relativeFromMonorepo: string,
  override?: string,
): string | null {
  if (override) {
    return existsSync(override) ? override : null;
  }
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) {
    return existsSync(fromEnv) ? fromEnv : null;
  }
  const candidate = resolve(defaultMonorepoRoot(), relativeFromMonorepo);
  return existsSync(candidate) ? candidate : null;
}

function missingSpaHtml(label: string, buildHint: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MetaLayer — ${label} unavailable</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${label} UI not built</h1>
  <p>The MetaLayer API is running, but the ${label} static build was not found.</p>
  <p>Build it, then restart the API:</p>
  <pre><code>${buildHint}</code></pre>
  <p>For hot-reload UI development, open the Rsbuild app URL instead of this API path.</p>
</body>
</html>`;
}

async function registerMissingSpa(
  app: FastifyInstance,
  prefix: '/configure' | '/admin',
  label: string,
  buildHint: string,
): Promise<void> {
  const html = missingSpaHtml(label, buildHint);
  const handler = async (
    _request: unknown,
    reply: { type: (t: string) => { status: (n: number) => { send: (b: string) => unknown } } },
  ) => reply.type('text/html').status(503).send(html);

  app.get(prefix, handler);
  app.get(`${prefix}/`, handler);
  app.get(`${prefix}/*`, handler);
}

async function registerBuiltSpa(
  app: FastifyInstance,
  prefix: '/configure' | '/admin',
  root: string,
  decorateReply: boolean,
): Promise<void> {
  await app.register(
    async (scope) => {
      await scope.register(fastifyStatic, {
        root,
        prefix: '/',
        decorateReply,
      });

      // Client-side routes (e.g. /configure/sources) fall through to index.html.
      scope.setNotFoundHandler(async (_request, reply) => {
        return reply.sendFile('index.html');
      });
    },
    { prefix },
  );

  app.get(prefix, async (_request, reply) => {
    return reply.redirect(`${prefix}/`);
  });
}

export const spaStaticPlugin: FastifyPluginAsync<SpaStaticOptions> = async (
  app,
  options,
) => {
  const configureRoot = resolveSpaRoot(
    'METALAYER_CONFIGURE_DIST',
    'apps/frontend/dist',
    options.configureRoot,
  );
  const adminRoot = resolveSpaRoot(
    'METALAYER_ADMIN_DIST',
    'apps/dashboard/dist',
    options.adminRoot,
  );

  let decorateReply = true;

  if (configureRoot) {
    await registerBuiltSpa(app, '/configure', configureRoot, decorateReply);
    decorateReply = false;
  } else {
    await registerMissingSpa(
      app,
      '/configure',
      'Configure',
      'pnpm -F @metalayer/frontend build',
    );
  }

  if (adminRoot) {
    await registerBuiltSpa(app, '/admin', adminRoot, decorateReply);
  } else {
    await registerMissingSpa(
      app,
      '/admin',
      'Admin',
      'pnpm -F @metalayer/dashboard build',
    );
  }

  app.get('/', async (_request, reply) => {
    return reply.redirect('/configure/');
  });

  if (!configureRoot || !adminRoot) {
    app.log.warn(
      {
        configureRoot: configureRoot ?? 'missing',
        adminRoot: adminRoot ?? 'missing',
        hint: 'Set METALAYER_CONFIGURE_DIST / METALAYER_ADMIN_DIST or build the SPAs.',
      },
      'SPA static roots incomplete',
    );
  }
};