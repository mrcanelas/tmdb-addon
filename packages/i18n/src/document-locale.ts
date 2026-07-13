import { getLocale } from './locale-registry.js';

/** Minimal document surface so @metalayer/i18n stays free of DOM lib. */
export interface DocumentLocaleTarget {
  documentElement: {
    lang: string;
    dir: string;
  };
}

function resolveDefaultDocument(): DocumentLocaleTarget {
  const globalDocument = (globalThis as { document?: DocumentLocaleTarget })
    .document;
  if (!globalDocument?.documentElement) {
    throw new Error(
      'applyDocumentLocale requires a document (pass doc explicitly in non-browser environments)',
    );
  }
  return globalDocument;
}

/**
 * Apply BCP 47 lang and document direction for the interface locale.
 * Used by configure shell, Language & Region, and command palette.
 */
export function applyDocumentLocale(
  localeId: string,
  doc: DocumentLocaleTarget = resolveDefaultDocument(),
): { lang: string; dir: 'ltr' | 'rtl' } {
  const locale = getLocale(localeId);
  const lang = locale?.bcp47 ?? localeId;
  const dir = locale?.direction ?? 'ltr';
  doc.documentElement.lang = lang;
  doc.documentElement.dir = dir;
  return { lang, dir };
}
