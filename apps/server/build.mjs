import { build } from 'esbuild';
import { readFile, readdir, rm } from 'node:fs/promises';

// Bundle workspace TypeScript, leaving installed third-party packages external.
// Plain Node must never have to resolve .js imports inside uncompiled .ts packages.
const external = new Set();
for (const directory of ['.', ...await readdir('../../packages').then(names => names.map(name => `../../packages/${name}`))]) {
  let pkg;
  try { pkg = JSON.parse(await readFile(`${directory}/package.json`, 'utf8')); }
  catch { continue; }
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (!version.startsWith('workspace:')) external.add(name);
  }
}
await rm('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.ts', 'src/app.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: [...external],
});
