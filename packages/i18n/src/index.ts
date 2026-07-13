export {
  LOCALE_REGISTRY,
  STABLE_LOCALES,
  CANONICAL_LOCALE,
  DEFAULT_FALLBACK_LOCALE,
  getLocale,
  isStableLocale,
  negotiateInterfaceLocale,
  type LocaleId,
  type LocaleDefinition,
} from './locale-registry.js';

export {
  applyDocumentLocale,
  type DocumentLocaleTarget,
} from './document-locale.js';

export {
  toPseudoExpanded,
  toPseudoRtl,
  transformMessageCatalog,
} from './pseudo.js';
