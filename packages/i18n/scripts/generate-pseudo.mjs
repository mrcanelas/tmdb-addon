import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'locales');
const namespaces = ['common', 'sources', 'catalogs', 'rules', 'sorting', 'inspector', 'tracking', 'corrections', 'searchAi', 'dashboard', 'resolution'];


const ACCENT_MAP = {
  A: 'Å',
  a: 'å',
  E: 'É',
  e: 'é',
  I: 'Î',
  i: 'î',
  O: 'Ø',
  o: 'ø',
  U: 'Û',
  u: 'û',
  C: 'Ç',
  c: 'ç',
  N: 'Ñ',
  n: 'ñ',
};

const RLM = '\u200F';
const LRM = '\u200E';

function toPseudoExpanded(text) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts
    .map((part) => {
      if (/^\{\{[^}]+\}\}$/.test(part)) return part;
      const accented = [...part].map((char) => ACCENT_MAP[char] ?? char).join('');
      if (accented.length === 0) return accented;
      return `${accented}${accented}`.slice(0, Math.ceil(accented.length * 1.3));
    })
    .join('');
}

function toPseudoRtl(text) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts
    .map((part) => {
      if (/^\{\{[^}]+\}\}$/.test(part)) return part;
      return `${RLM}${part}${LRM}`;
    })
    .join('');
}

function transformCatalog(catalog, mode) {
  const transform = mode === 'en-XA' ? toPseudoExpanded : toPseudoRtl;
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [key, transform(value)]),
  );
}

for (const namespace of namespaces) {
  const canonical = JSON.parse(
    readFileSync(join(localesDir, 'en-US', `${namespace}.json`), 'utf8'),
  );

  for (const locale of ['en-XA', 'ar-XB']) {
    const dir = join(localesDir, locale);
    mkdirSync(dir, { recursive: true });
    const transformed = transformCatalog(canonical, locale);
    writeFileSync(
      join(dir, `${namespace}.json`),
      `${JSON.stringify(transformed, null, 2)}\n`,
      'utf8',
    );
  }
}

console.log('i18n:pseudo generated en-XA and ar-XB from en-US');
