import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Physical CSS / Tailwind layout utilities that break RTL readiness. */
const PHYSICAL_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'margin-left', pattern: /margin-left\s*:/ },
  { id: 'margin-right', pattern: /margin-right\s*:/ },
  { id: 'padding-left', pattern: /padding-left\s*:/ },
  { id: 'padding-right', pattern: /padding-right\s*:/ },
  {
    id: 'tailwind-margin-x',
    // MetaLayer keeps ml-glass / ml-text-* utilities; ban numeric ml-/mr- only.
    pattern: /(?:^|[\s"'`])m[lr]-(?:\[|[0-9])/m,
  },
  {
    id: 'tailwind-padding-x',
    pattern: /(?:^|[\s"'`])p[lr]-(?:\[|[0-9])/m,
  },
  {
    id: 'tailwind-inset-x',
    pattern: /(?:^|[\s"'`])(?:left|right)-(?:\[|[0-9]|auto|full|px)/m,
  },
];

const FILE_EXTENSIONS = new Set(['.tsx', '.ts', '.css']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf('.'));
    if (!FILE_EXTENSIONS.has(ext)) continue;
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue;
    out.push(full);
  }
  return out;
}

describe('configure RTL layout foundations', () => {
  it('avoids physical left/right layout CSS in frontend source', () => {
    const files = walk(SRC_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const rel = relative(SRC_ROOT, file).replace(/\\/g, '/');
      for (const { id, pattern } of PHYSICAL_PATTERNS) {
        if (pattern.test(source)) {
          violations.push(`${rel}: ${id}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
