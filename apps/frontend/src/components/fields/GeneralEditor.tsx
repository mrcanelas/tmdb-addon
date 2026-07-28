import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_PRESENTATION,
  LocalizationPreferencesSchema,
  PresentationConfigSchema,
  type LocalizationPreferences,
  type PresentationConfig,
} from '@metalayer/config';
import {
  applyDocumentLocale,
  formatCodedDisplayName,
  formatLanguageDisplayName,
  formatRegionDisplayName,
  formatTimezoneDisplayName,
  STABLE_LOCALES,
} from '@metalayer/i18n';
import { Button, toast } from '@metalayer/shared-ui';
import { Plus, X } from 'lucide-react';
import {
  ensureStudioSession,
  fetchLocalization,
  fetchMetadataLanguages,
  fetchPresentation,
  fetchResolutionConfig,
  saveLocalization,
  savePresentation,
  saveResolutionConfig,
} from '@/lib/api';
import { applyLocalizationLocalesToResolution } from '@/lib/field-plans';
import { i18n } from '@/lib/i18n';
import { useConfigureUiStore } from '@/stores/ui-store';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { LocaleFlag } from '@/components/fields/field-icons';
import { cn } from '@/lib/utils';

const SELECT_CLASS =
  'h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)]';

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

const CAST_COUNT_OPTIONS: Array<PresentationConfig['castCount'] | 'unlimited'> = [
  'unlimited',
  0,
  5,
  10,
  15,
];

function applyInterfaceLocale(locale: string) {
  void i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
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

function metadataLanguageOrder(
  localization: LocalizationPreferences,
): string[] {
  return [
    localization.metadataLocale,
    ...localization.metadataFallbackLocales.filter(
      (locale) =>
        locale.toLowerCase() !== localization.metadataLocale.toLowerCase(),
    ),
  ];
}

function withMetadataLanguageOrder(
  localization: LocalizationPreferences,
  order: string[],
): LocalizationPreferences {
  const unique = order
    .map((value) => value.trim())
    .filter(Boolean)
    .filter(
      (value, index, all) =>
        all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) ===
        index,
    );
  const primary = unique[0] ?? localization.metadataLocale;
  return {
    ...localization,
    metadataLocale: primary,
    metadataFallbackLocales: unique.slice(1),
  };
}

/** Combined Language & Region + Presentation editor for Metas → General. */
export function GeneralEditor() {
  const { t } = useTranslation(['languageRegion', 'common']);
  const { t: tp } = useTranslation('presentation');
  const displayLocale = i18n.language || 'en-US';
  const mode = useConfigureUiStore((s) => s.mode);
  const isAdvanced = mode === 'advanced';

  const [localization, setLocalization] =
    useState<LocalizationPreferences | null>(null);
  const [presentation, setPresentation] = useState<PresentationConfig | null>(
    null,
  );
  const [languageOptions, setLanguageOptions] = useState<
    Array<{ value: string; name: string }>
  >([]);
  const [addLocale, setAddLocale] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [applyingChains, setApplyingChains] = useState(false);

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const [localizationResult, presentationResult, languages] =
        await Promise.all([
          fetchLocalization(session.configId, session.editCredential),
          fetchPresentation(session.configId, session.editCredential),
          fetchMetadataLanguages().catch(() => []),
        ]);
      const nextLocalization = LocalizationPreferencesSchema.parse(
        localizationResult.localization,
      );
      const nextPresentation = PresentationConfigSchema.parse(
        presentationResult.presentation ?? DEFAULT_PRESENTATION,
      );
      setLocalization(nextLocalization);
      setPresentation(nextPresentation);
      setLanguageOptions(languages);
      applyInterfaceLocale(nextLocalization.interfaceLocale);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patchLocalization(partial: Partial<LocalizationPreferences>) {
    setLocalization((current) => {
      if (!current) return current;
      return { ...current, ...partial };
    });
  }

  function patchPresentation(partial: Partial<PresentationConfig>) {
    setPresentation((current) => {
      if (!current) return current;
      return { ...current, ...partial };
    });
  }

  const orderedLocales = useMemo(
    () => (localization ? metadataLanguageOrder(localization) : []),
    [localization],
  );

  const availableToAdd = useMemo(() => {
    const selected = new Set(orderedLocales.map((value) => value.toLowerCase()));
    return languageOptions.filter(
      (option) => !selected.has(option.value.toLowerCase()),
    );
  }, [languageOptions, orderedLocales]);

  async function onSave() {
    if (!localization || !presentation) return;
    if (orderedLocales.length === 0) {
      toast.danger(t('languageRegion.metadataLocalesEmpty'));
      return;
    }
    setSaving(true);
    try {
      const localizationPayload = LocalizationPreferencesSchema.parse({
        ...localization,
        ...(isAdvanced
          ? {}
          : {
              metadataLocale: localization.metadataLocale,
              availabilityRegion: localization.contentRegion,
              certificationRegion: localization.contentRegion,
              releaseRegion: localization.contentRegion,
            }),
      });
      const presentationPayload = PresentationConfigSchema.parse(presentation);
      const session = await ensureStudioSession();
      const [savedLocalization, savedPresentation] = await Promise.all([
        saveLocalization(
          session.configId,
          session.editCredential,
          localizationPayload,
        ),
        savePresentation(
          session.configId,
          session.editCredential,
          presentationPayload,
        ),
      ]);
      setLocalization(savedLocalization.localization);
      setPresentation(savedPresentation.presentation);
      applyInterfaceLocale(savedLocalization.localization.interfaceLocale);
      toast.success(t('languageRegion.saveOk'));
    } catch {
      toast.danger(t('languageRegion.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyToChains() {
    if (!localization) return;
    setApplyingChains(true);
    try {
      const session = await ensureStudioSession();
      const current = await fetchResolutionConfig(
        session.configId,
        session.editCredential,
      );
      const next = applyLocalizationLocalesToResolution(
        current.resolution,
        localization,
      );
      await saveResolutionConfig(
        session.configId,
        session.editCredential,
        next,
      );
      toast.success(t('languageRegion.applyToChainsOk'));
    } catch {
      toast.danger(t('languageRegion.applyToChainsError'));
    } finally {
      setApplyingChains(false);
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

      {status === 'ready' && localization && presentation ? (
        <>
          <SectionCard>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-[var(--foreground)]">
                <span>{t('languageRegion.interface')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.interfaceLocale}
                  onChange={(event) => {
                    const interfaceLocale = event.target.value;
                    if (isAdvanced) {
                      patchLocalization({ interfaceLocale });
                    } else {
                      const next = withMetadataLanguageOrder(
                        {
                          ...localization,
                          interfaceLocale,
                          metadataLocale: interfaceLocale,
                        },
                        [
                          interfaceLocale,
                          ...localization.metadataFallbackLocales,
                        ],
                      );
                      setLocalization(next);
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
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t('languageRegion.metadataLocales')}
                </p>
                <p className="text-xs ml-text-muted">
                  {t('languageRegion.metadataLocalesHint')}
                </p>
              </div>
              <ul className="flex flex-wrap items-center gap-2">
                {orderedLocales.map((locale, index) => (
                  <li
                    key={`${locale}-${index}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-1.5"
                  >
                    <LocaleFlag locale={{ type: 'locale', value: locale }} />
                    <span className="max-w-40 truncate text-sm font-medium">
                      {formatCodedDisplayName(
                        formatLanguageDisplayName(locale, displayLocale),
                        locale,
                      )}
                    </span>
                    {index === 0 ? (
                      <span className="text-[10px] uppercase tracking-wide ml-text-muted">
                        1º
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-md p-0.5 text-[var(--muted-foreground)] hover:bg-[var(--default)]"
                      aria-label={t('common:actions.remove', {
                        defaultValue: 'Remove',
                      })}
                      disabled={orderedLocales.length <= 1}
                      onClick={() =>
                        setLocalization((current) =>
                          current
                            ? withMetadataLanguageOrder(
                                current,
                                orderedLocales.filter((_, i) => i !== index),
                              )
                            : current,
                        )
                      }
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={cn(SELECT_CLASS, 'min-w-48')}
                  value={addLocale}
                  onChange={(event) => setAddLocale(event.target.value)}
                >
                  <option value="">
                    {t('languageRegion.metadataLocalesAdd')}
                  </option>
                  {availableToAdd.map((option) => (
                    <option key={option.value} value={option.value}>
                      {formatCodedDisplayName(
                        formatLanguageDisplayName(option.value, displayLocale) ||
                          option.name,
                        option.value,
                      )}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isDisabled={!addLocale}
                  onPress={() => {
                    if (!addLocale) return;
                    setLocalization((current) =>
                      current
                        ? withMetadataLanguageOrder(current, [
                            ...orderedLocales,
                            addLocale,
                          ])
                        : current,
                    );
                    setAddLocale('');
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  {t('languageRegion.metadataLocalesAdd')}
                </Button>
              </div>
              <p className="text-xs ml-text-muted">
                {t('languageRegion.applyToChainsHint')}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isDisabled={applyingChains}
                onPress={() => {
                  void onApplyToChains();
                }}
              >
                {t('languageRegion.applyToChains')}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t('languageRegion.section.region')}>
            {!isAdvanced ? (
              <label className="grid max-w-xs gap-1 text-sm text-[var(--foreground)]">
                <span>{t('languageRegion.country')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.contentRegion}
                  onChange={(event) => {
                    const country = event.target.value.toUpperCase();
                    setLocalization((current) =>
                      current
                        ? syncRegionsFromCountry(current, country)
                        : current,
                    );
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
                    className="grid gap-1 text-sm text-[var(--foreground)]"
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
                          patchLocalization({ contentRegion: value });
                        } else {
                          patchLocalization({ [field]: value });
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

            <label className="mt-4 grid max-w-md gap-1 text-sm text-[var(--foreground)]">
              <span>{t('languageRegion.timezone')}</span>
              <select
                className={SELECT_CLASS}
                value={localization.timezone}
                onChange={(event) =>
                  patchLocalization({ timezone: event.target.value })
                }
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
              <span className="text-xs ml-text-muted">
                {t('languageRegion.timezoneHint')}
              </span>
            </label>
          </SectionCard>

          <SectionCard title={t('languageRegion.section.display')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-[var(--foreground)]">
                <span>{t('languageRegion.titleMode')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.titleMode}
                  onChange={(event) =>
                    patchLocalization({
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
              <label className="grid gap-1 text-sm text-[var(--foreground)]">
                <span>{t('languageRegion.descriptionMode')}</span>
                <select
                  className={SELECT_CLASS}
                  value={localization.descriptionMode}
                  onChange={(event) =>
                    patchLocalization({
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

          <SectionCard title={tp('presentation.section.display')}>
            <label className="grid max-w-xs gap-1 text-sm text-[var(--foreground)]">
              <span>{tp('presentation.castCount')}</span>
              <select
                className={SELECT_CLASS}
                value={
                  presentation.castCount === undefined
                    ? 'unlimited'
                    : String(presentation.castCount)
                }
                onChange={(event) => {
                  const value = event.target.value;
                  patchPresentation({
                    castCount:
                      value === 'unlimited'
                        ? undefined
                        : (Number(value) as PresentationConfig['castCount']),
                  });
                }}
              >
                {CAST_COUNT_OPTIONS.map((option) => (
                  <option
                    key={String(option)}
                    value={option === 'unlimited' ? 'unlimited' : String(option)}
                  >
                    {option === 'unlimited'
                      ? tp('presentation.castCount.unlimited')
                      : tp('presentation.castCount.members', { count: option })}
                  </option>
                ))}
              </select>
              <span className="text-xs ml-text-muted">
                {tp('presentation.castCountHint')}
              </span>
            </label>

            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={presentation.showAgeRatingInGenres}
                onChange={(event) =>
                  patchPresentation({
                    showAgeRatingInGenres: event.target.checked,
                  })
                }
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {tp('presentation.showAgeRatingInGenres')}
                </span>
                <span className="mt-0.5 block text-xs ml-text-muted">
                  {tp('presentation.showAgeRatingInGenresHint')}
                </span>
              </span>
            </label>
          </SectionCard>

          <SectionCard title={tp('presentation.section.catalog')}>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={presentation.catalogNamePrefix}
                onChange={(event) =>
                  patchPresentation({
                    catalogNamePrefix: event.target.checked,
                  })
                }
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {tp('presentation.catalogNamePrefix')}
                </span>
                <span className="mt-0.5 block text-xs ml-text-muted">
                  {tp('presentation.catalogNamePrefixHint')}
                </span>
              </span>
            </label>
          </SectionCard>

          <SectionCard title={tp('presentation.section.episodes')}>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={presentation.hideEpisodeSpoilers}
                onChange={(event) =>
                  patchPresentation({
                    hideEpisodeSpoilers: event.target.checked,
                  })
                }
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {tp('presentation.hideEpisodeSpoilers')}
                </span>
                <span className="mt-0.5 block text-xs ml-text-muted">
                  {tp('presentation.hideEpisodeSpoilersHint')}
                </span>
                {presentation.hideEpisodeSpoilers ? (
                  <span className="mt-1 block text-xs text-[var(--warning)]">
                    {tp('presentation.pendingRuntime')}
                  </span>
                ) : null}
              </span>
            </label>
          </SectionCard>

          <SectionCard title={tp('presentation.section.artwork')}>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={presentation.ratingPostersForLibrary}
                onChange={(event) =>
                  patchPresentation({
                    ratingPostersForLibrary: event.target.checked,
                  })
                }
              />
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {tp('presentation.ratingPostersForLibrary')}
                </span>
                <span className="mt-0.5 block text-xs ml-text-muted">
                  {tp('presentation.ratingPostersForLibraryHint')}
                </span>
                {presentation.ratingPostersForLibrary ? (
                  <span className="mt-1 block text-xs text-[var(--warning)]">
                    {tp('presentation.pendingRuntime')}
                  </span>
                ) : null}
              </span>
            </label>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onPress={() => {
                void onSave();
              }}
              isDisabled={saving}
            >
              {saving
                ? t('languageRegion.saving')
                : t('languageRegion.saveAll')}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
