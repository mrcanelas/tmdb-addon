import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Built-in community sample set for alpha demos and contract tests. */
export function loadSampleCommunityCorrections(): unknown[] {
  const file = join(dirname(fileURLToPath(import.meta.url)), 'sample-corrections.json');
  return JSON.parse(readFileSync(file, 'utf8')) as unknown[];
}
