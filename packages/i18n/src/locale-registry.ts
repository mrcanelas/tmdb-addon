export type LocaleId = 'en-US' | 'pt-BR' | 'es-ES' | 'en-XA' | 'ar-XB';

export interface LocaleDefinition {
  id: LocaleId;
  bcp47: string;
  direction: 'ltr' | 'rtl';
  status: 'stable' | 'pseudo' | 'community';
  displayName: string;
}

export const LOCALE_REGISTRY: LocaleDefinition[] = [
  {
    id: 'en-US',
    bcp47: 'en-US',
    direction: 'ltr',
    status: 'stable',
    displayName: 'English (United States)',
  },
  {
    id: 'pt-BR',
    bcp47: 'pt-BR',
    direction: 'ltr',
    status: 'stable',
    displayName: 'Português (Brasil)',
  },
  {
    id: 'es-ES',
    bcp47: 'es-ES',
    direction: 'ltr',
    status: 'stable',
    displayName: 'Español (España)',
  },
  {
    id: 'en-XA',
    bcp47: 'en-XA',
    direction: 'ltr',
    status: 'pseudo',
    displayName: 'Pseudo (Expanded)',
  },
  {
    id: 'ar-XB',
    bcp47: 'ar-XB',
    direction: 'rtl',
    status: 'pseudo',
    displayName: 'Pseudo (RTL)',
  },
];

export const STABLE_LOCALES: LocaleId[] = ['en-US', 'pt-BR', 'es-ES'];
export const CANONICAL_LOCALE: LocaleId = 'en-US';
export const DEFAULT_FALLBACK_LOCALE: LocaleId = 'en-US';

export function getLocale(id: string): LocaleDefinition | undefined {
  return LOCALE_REGISTRY.find((locale) => locale.id === id || locale.bcp47 === id);
}

export function isStableLocale(id: string): boolean {
  return STABLE_LOCALES.includes(id as LocaleId);
}

/**
 * Resolve interface locale preference order:
 * explicit → configuration → authenticated user → browser → en-US
 */
export function negotiateInterfaceLocale(candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = getLocale(candidate);
    if (match) return match.id;
    const base = candidate.split('-')[0];
    const byBase = LOCALE_REGISTRY.find((locale) => locale.id.startsWith(`${base}-`) && locale.status === 'stable');
    if (byBase) return byBase.id;
  }
  return DEFAULT_FALLBACK_LOCALE;
}
