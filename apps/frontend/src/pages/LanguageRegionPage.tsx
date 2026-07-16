import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LocalizationPreferences } from '@metalayer/config';
import { LocalizationPreferencesSchema } from '@metalayer/config';
import {
  applyDocumentLocale,
  formatCodedDisplayName,
  formatLanguageDisplayName,
  formatRegionDisplayName,
  formatTimezoneDisplayName,
  STABLE_LOCALES,
} from '@metalayer/i18n';
import { Button } from '@metalayer/shared-ui';
import {
  ensureStudioSession,
  fetchLocalization,
  saveLocalization,
} from '@/lib/api';
import { i18n } from '@/lib/i18n';
import { useConfigureUiStore } from '@/stores/ui-store';
import { usePageHeader } from '@/contexts/page-title';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const SELECT_CLASS =
  'h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]';

const REGION_OPTIONS = [
  'US',
  'BR',
  'PT',
  'ES',
  'MX',
  'AR',
  'GB',
  'FR',
  'DE',
  'IT',
  'JP',
  'KR',
  'CA',
  'AU',
] as const;

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/New_York',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
] as const;

const TITLE_MODES = [
  'localized',
  'original',
  'localized-with-original',
  'original-with-localized',
] as const;

const DESCRIPTION_MODES = ['localized', 'original', 'best-available'] as const;

function applyInterfaceLocale(locale: string) {
  void i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
}

function parseFallbacks(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function syncRegionsFromCountry(
  localization: LocalizationPreferences,
  country: string,
): LocalizationPreferences {
  return {
    ...localization,
    contentRegion: country,
    availabilityRegion: country,
    certificationRegion: country,
    releaseRegion: country,
  };
}

export function LanguageRegionPage() {
  const { t } = useTranslation(['languageRegion', 'common']);
  usePageHeader(t('languageRegion.title'), t('languageRegion.intro'));
  const displayLocale = i18n.language || 'en-US';
  const mode = useConfigureUiStore((s) => s.mode);
  const isAdvanced = mode === 'advanced';

  const [localization, setLocalization] =
    useState<LocalizationPreferences | null>(null);
  const [fallbackText, setFallbackText] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const result = await fetchLocalization(
        session.configId,
        session.editCredential,
      );
      const next = LocalizationPreferencesSchema.parse(result.localization);
      setLocalization(next);
      setFallbackText(next.metadataFallbackLocales.join(', '));
      applyInterfaceLocale(next.interfaceLocale);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch(partial: Partial<LocalizationPreferences>) {
    setLocalization((current) => {
      if (!current) return current;
      return { ...current, ...partial };
    });
    setSaveState('idle');
  }

  async function onSave() {
    if (!localization) return;
    setSaveState('saving');
    try {
      const payload = LocalizationPreferencesSchema.parse({
        ...localization,
        metadataFallbackLocales: isAdvanced
          ? parseFallbacks(fallbackText)
          : localization.metadataFallbackLocales,
        ...(isAdvanced
          ? {}
          : {
              metadataLocale: localization.interfaceLocale,
              availabilityRegion: localization.contentRegion,
              certificationRegion: localization.contentRegion,
              releaseRegion: localization.contentRegion,
            }),
      });
      const session = await ensureStudioSession();
      const saved = await saveLocalization(
        session.configId,
        session.editCredential,
        payload,
      );
      setLocalization(saved.localization);
      setFallbackText(saved.localization.metadataFallbackLocales.join(', '));
      applyInterfaceLocale(saved.localization.interfaceLocale);
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  return (
    <section className="space-y-6">
      {status === 'loading' ? (
        <LoadingState label={t('languageRegion.loading')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('languageRegion.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' && localization ? (
        <>
          <p className="text-sm ml-text-muted">
            {isAdvanced
              ? t('languageRegion.advancedHint')
              : t('languageRegion.simpleHint')}
          </p>

          <SectionCard title={t('languageRegion.section.language')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('languageRegion.interface')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.interfaceLocale}
                  onChange={(event) => {
                    const interfaceLocale = event.target.value;
                    if (isAdvanced) {
                      patch({ interfaceLocale });
                    } else {
                      patch({
                        interfaceLocale,
                        metadataLocale: interfaceLocale,
                      });
                    }
                    applyInterfaceLocale(interfaceLocale);
                  }}
                >
                  {STABLE_LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {formatCodedDisplayName(
                        formatLanguageDisplayName(locale, displayLocale),
                        locale,
                      )}
                    </option>
                  ))}
                </select>
              </label>

              {isAdvanced ? (
                <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                  <span>{t('languageRegion.metadata')}</span>
                  <select
                    className={SELECT_CLASS}
                    value={localization.metadataLocale}
                    onChange={(event) =>
                      patch({ metadataLocale: event.target.value })
                    }
                  >
                    {[
                      ...new Set([
                        ...STABLE_LOCALES,
                        localization.metadataLocale,
                      ]),
                    ].map((locale) => (
                      <option key={locale} value={locale}>
                        {formatCodedDisplayName(
                          formatLanguageDisplayName(locale, displayLocale),
                          locale,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {isAdvanced ? (
              <label className="mt-4 grid gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('languageRegion.fallbacks')}</span>
                <input
                  className={`${SELECT_CLASS} w-full`}
                  value={fallbackText}
                  placeholder={t('languageRegion.fallbacksPlaceholder')}
                  onChange={(event) => {
                    setFallbackText(event.target.value);
                    setSaveState('idle');
                  }}
                />
                <span className="text-xs ml-text-muted">
                  {t('languageRegion.fallbacksHint')}
                </span>
              </label>
            ) : null}
          </SectionCard>

          <SectionCard title={t('languageRegion.section.region')}>
            {!isAdvanced ? (
              <label className="grid max-w-xs gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('languageRegion.country')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.contentRegion}
                  onChange={(event) => {
                    const country = event.target.value.toUpperCase();
                    setLocalization((current) =>
                      current ? syncRegionsFromCountry(current, country) : current,
                    );
                    setSaveState('idle');
                  }}
                >
                  {REGION_OPTIONS.map((region) => (
                    <option key={region} value={region}>
                      {formatCodedDisplayName(
                        formatRegionDisplayName(region, displayLocale),
                        region,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['contentRegion', 'languageRegion.contentRegion'],
                    ['availabilityRegion', 'languageRegion.availabilityRegion'],
                    [
                      'certificationRegion',
                      'languageRegion.certificationRegion',
                    ],
                    ['releaseRegion', 'languageRegion.releaseRegion'],
                  ] as const
                ).map(([field, labelKey]) => (
                  <label
                    key={field}
                    className="grid gap-1 text-sm text-[var(--ml-text)]"
                  >
                    <span>{t(labelKey)}</span>
                    <select
                      className={SELECT_CLASS}
                      value={
                        (localization[field] as string | undefined) ??
                        localization.contentRegion
                      }
                      onChange={(event) => {
                        const value = event.target.value.toUpperCase();
                        if (field === 'contentRegion') {
                          patch({ contentRegion: value });
                        } else {
                          patch({ [field]: value });
                        }
                      }}
                    >
                      {field !== 'contentRegion' ? (
                        <option value={localization.contentRegion}>
                          {t('languageRegion.sameAsContent')} (
                          {localization.contentRegion})
                        </option>
                      ) : null}
                      {REGION_OPTIONS.filter(
                        (region) =>
                          field === 'contentRegion' ||
                          region !== localization.contentRegion,
                      ).map((region) => (
                        <option key={region} value={region}>
                          {formatCodedDisplayName(
                            formatRegionDisplayName(region, displayLocale),
                            region,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}

            <label className="mt-4 grid max-w-md gap-1 text-sm text-[var(--ml-text)]">
              <span>{t('languageRegion.timezone')}</span>
              <select
                className={SELECT_CLASS}
                value={localization.timezone}
                onChange={(event) => patch({ timezone: event.target.value })}
              >
                {[
                  ...new Set([...TIMEZONE_OPTIONS, localization.timezone]),
                ].map((zone) => (
                  <option key={zone} value={zone}>
                    {formatCodedDisplayName(
                      formatTimezoneDisplayName(zone, displayLocale),
                      zone,
                    )}
                  </option>
                ))}
              </select>
            </label>
          </SectionCard>

          <SectionCard title={t('languageRegion.section.display')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('languageRegion.titleMode')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.titleMode}
                  onChange={(event) =>
                    patch({
                      titleMode: event.target
                        .value as LocalizationPreferences['titleMode'],
                    })
                  }
                >
                  {TITLE_MODES.map((titleMode) => (
                    <option key={titleMode} value={titleMode}>
                      {t(`languageRegion.titleMode.${titleMode}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('languageRegion.descriptionMode')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.descriptionMode}
                  onChange={(event) =>
                    patch({
                      descriptionMode: event.target
                        .value as LocalizationPreferences['descriptionMode'],
                    })
                  }
                >
                  {DESCRIPTION_MODES.map((descriptionMode) => (
                    <option key={descriptionMode} value={descriptionMode}>
                      {t(`languageRegion.descriptionMode.${descriptionMode}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onPress={() => {
                void onSave();
              }}
              isDisabled={saveState === 'saving'}
            >
              {saveState === 'saving'
                ? t('languageRegion.saving')
                : t('languageRegion.save')}
            </Button>
            {saveState === 'ok' ? (
              <p className="text-sm text-[var(--ml-success)]" role="status">
                {t('languageRegion.saveOk')}
              </p>
            ) : null}
            {saveState === 'error' ? (
              <p className="text-sm text-[var(--ml-error)]" role="alert">
                {t('languageRegion.saveError')}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
