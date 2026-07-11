/**
 * Pseudo-localization helpers for layout and i18n QA.
 * en-XA: expanded accented text
 * ar-XB: RTL-wrapped text
 */

const ACCENT_MAP: Record<string, string> = {
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

export function toPseudoExpanded(text: string): string {
  // Keep {{placeholders}} intact; accent and expand only surrounding text.
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts
    .map((part) => {
      if (/^\{\{[^}]+\}\}$/.test(part)) return part;
      const accented = [...part]
        .map((char) => ACCENT_MAP[char] ?? char)
        .join('');
      if (accented.length === 0) return accented;
      return `${accented}${accented}`.slice(0, Math.ceil(accented.length * 1.3));
    })
    .join('');
}

export function toPseudoRtl(text: string): string {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts
    .map((part) => {
      if (/^\{\{[^}]+\}\}$/.test(part)) return part;
      return `${RLM}${part}${LRM}`;
    })
    .join('');
}

export function transformMessageCatalog(
  catalog: Record<string, string>,
  mode: 'en-XA' | 'ar-XB',
): Record<string, string> {
  const transform = mode === 'en-XA' ? toPseudoExpanded : toPseudoRtl;
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [key, transform(value)]),
  );
}
