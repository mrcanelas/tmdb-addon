import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'locales');
const stableLocales = ['en-US', 'pt-BR', 'es-ES'];
const pseudoLocales = ['en-XA', 'ar-XB'];
const namespaces = ['common', 'sources', 'catalogs', 'rules', 'sorting', 'inspector', 'tracking', 'corrections', 'searchAi'];

function loadLocale(locale, namespace) {
  return JSON.parse(readFileSync(join(localesDir, locale, `${namespace}.json`), 'utf8'));
}

const errors = [];
let totalKeys = 0;

for (const namespace of namespaces) {
  const canonical = loadLocale('en-US', namespace);
  const canonicalKeys = Object.keys(canonical).sort();
  totalKeys += canonicalKeys.length;

  for (const locale of [...stableLocales, ...pseudoLocales]) {
    let messages;
    try {
      messages = loadLocale(locale, namespace);
    } catch {
      errors.push(`[${locale}/${namespace}] missing catalog file`);
      continue;
    }
    for (const key of canonicalKeys) {
      if (!(key in messages)) {
        errors.push(`[${locale}/${namespace}] missing key: ${key}`);
      }
    }
    for (const key of Object.keys(messages)) {
      if (!canonicalKeys.includes(key)) {
        errors.push(`[${locale}/${namespace}] unknown key: ${key}`);
      }
    }
  }
}

if (errors.length) {
  console.error('i18n:check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `i18n:check passed (${totalKeys} keys × ${namespaces.length} namespaces × ${stableLocales.length} stable + ${pseudoLocales.length} pseudo)`,
);
