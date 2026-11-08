/**
 * Locale-aware display labels via `Intl` (AGENTS.md §9.10).
 * Falls back to the raw code when the engine cannot resolve a useful name.
 */

function createDisplayNames(
  displayLocale: string,
  type: 'language' | 'region',
): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([displayLocale], { type });
  } catch {
    try {
      return new Intl.DisplayNames(['en-US'], { type });
    } catch {
      return null;
    }
  }
}

function isUsefulLabel(label: string | undefined, code: string): label is string {
  if (!label) return false;
  if (label === code) return false;
  if (/unknown/i.test(label)) return false;
  return true;
}

export function formatLanguageDisplayName(
  languageTag: string,
  displayLocale: string,
): string {
  const names = createDisplayNames(displayLocale, 'language');
  const label = names?.of(languageTag);
  return isUsefulLabel(label, languageTag) ? label : languageTag;
}

export function formatRegionDisplayName(
  regionCode: string,
  displayLocale: string,
): string {
  const region = regionCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) return regionCode;
  const names = createDisplayNames(displayLocale, 'region');
  const label = names?.of(region);
  return isUsefulLabel(label, region) ? label : region;
}

export function formatTimezoneDisplayName(
  timeZone: string,
  displayLocale: string,
): string {
  try {
    const parts = new Intl.DateTimeFormat(displayLocale, {
      timeZone,
      timeZoneName: 'longGeneric',
    }).formatToParts(new Date());
    const name = parts.find((part) => part.type === 'timeZoneName')?.value;
    if (isUsefulLabel(name, timeZone)) return name;
  } catch {
    // Invalid zone or unsupported options.
  }
  return timeZone;
}

/** Option label: localized name with stable code for operators (e.g. "Brasil (BR)"). */
export function formatCodedDisplayName(
  localizedName: string,
  code: string,
): string {
  if (!localizedName || localizedName === code) return code;
  return `${localizedName} (${code})`;
}
