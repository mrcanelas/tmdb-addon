import { getLocale } from './locale-registry.js';

/**
 * Apply BCP 47 lang and document direction for the interface locale.
 * Used by configure shell, Language & Region, and command palette.
 */
export function applyDocumentLocale(
  localeId: string,
  doc: Pick<Document, 'documentElement'> = document,
): { lang: string; dir: 'ltr' | 'rtl' } {
  const locale = getLocale(localeId);
  const lang = locale?.bcp47 ?? localeId;
  const dir = locale?.direction ?? 'ltr';
  doc.documentElement.lang = lang;
  doc.documentElement.dir = dir;
  return { lang, dir };
}
