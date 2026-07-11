import { buildApp } from './app.js';

const port = Number(process.env.METALAYER_API_PORT ?? process.env.PORT ?? 1338);
const host = process.env.METALAYER_API_HOST ?? '0.0.0.0';

const app = await buildApp();

try {
  await app.listen({ port, host });
  app.log.info(`MetaLayer API listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
