import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_PRESENTATION,
  LocalizationPreferencesSchema,
  PresentationConfigSchema,
  type LocalizationPreferences,
  type PresentationConfig,
} from '@metalayer/config';
import {
  formatCodedDisplayName,
  formatLanguageDisplayName,
  formatTimezoneDisplayName,
} from '@metalayer/i18n';
import {
  Button,
  Card,
  Checkbox,
  ListBox,
  Select,
  toast,
} from '@metalayer/shared-ui';
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
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { LocaleFlag } from '@/components/fields/field-icons';

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

const CAST_COUNT_OPTIONS: Array<PresentationConfig['castCount'] | 'unlimited'> =
  ['unlimited', 0, 5, 10, 15];

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

function GeneralSelect({
  'aria-label': ariaLabel,
  value,
  onChange,
  placeholder,
  className,
  children,
}: {
  'aria-label': string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(key) => {
        onChange(key == null ? null : String(key));
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>{children}</ListBox>
      </Select.Popover>
    </Select>
  );
}

function SelectOption({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <ListBox.Item id={id} textValue={label}>
      {label}
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

/** Lean General editor: display languages, timezone, and presentation toggles. */
export function GeneralEditor() {
  const { t } = useTranslation(['languageRegion', 'common']);
  const { t: tp } = useTranslation('presentation');
  const displayLocale = i18n.language || 'en-US';

  const [localization, setLocalization] =
    useState<LocalizationPreferences | null>(null);
  const [presentation, setPresentation] = useState<PresentationConfig | null>(
    null,
  );
  const [languageOptions, setLanguageOptions] = useState<
    Array<{ value: string; name: string }>
  >([]);
  const [addLocale, setAddLocale] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);

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
      setLocalization(
        LocalizationPreferencesSchema.parse(localizationResult.localization),
      );
      setPresentation(
        PresentationConfigSchema.parse(
          presentationResult.presentation ?? DEFAULT_PRESENTATION,
        ),
      );
      setLanguageOptions(languages);
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

  const timezoneOptions = useMemo(() => {
    if (!localization) return [...TIMEZONE_OPTIONS];
    return [...new Set([...TIMEZONE_OPTIONS, localization.timezone])];
  }, [localization]);

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
        availabilityRegion: localization.contentRegion,
        certificationRegion: localization.contentRegion,
        releaseRegion: localization.contentRegion,
      });
      const presentationPayload = PresentationConfigSchema.parse(presentation);
      const session = await ensureStudioSession();
      const [savedLocalization, savedPresentation, currentResolution] =
        await Promise.all([
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
          fetchResolutionConfig(session.configId, session.editCredential),
        ]);
      await saveResolutionConfig(
        session.configId,
        session.editCredential,
        applyLocalizationLocalesToResolution(
          currentResolution.resolution,
          savedLocalization.localization,
        ),
      );
      setLocalization(savedLocalization.localization);
      setPresentation(savedPresentation.presentation);
      toast.success(t('languageRegion.saveOk'));
    } catch {
      toast.danger(t('languageRegion.saveError'));
    } finally {
      setSaving(false);
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
        <Card className="flex xl:h-[calc(100dvh-8.25rem)]">
          <div className="grid gap-8 lg:grid-cols-2 h-full">
            <div className="space-y-6">
              <div className="space-y-2">
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
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={t('common:actions.remove', {
                          defaultValue: 'Remove',
                        })}
                        isDisabled={orderedLocales.length <= 1}
                        onPress={() =>
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
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-end gap-2">
                  <GeneralSelect
                    aria-label={t('languageRegion.metadataLocalesAdd')}
                    className="min-w-48 flex-1"
                    placeholder={t('languageRegion.metadataLocalesAdd')}
                    value={addLocale}
                    onChange={setAddLocale}
                  >
                    {availableToAdd.map((option) => {
                      const label = formatCodedDisplayName(
                        formatLanguageDisplayName(
                          option.value,
                          displayLocale,
                        ) || option.name,
                        option.value,
                      );
                      return (
                        <SelectOption
                          key={option.value}
                          id={option.value}
                          label={label}
                        />
                      );
                    })}
                  </GeneralSelect>
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
                      setAddLocale(null);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    {t('languageRegion.metadataLocalesAdd')}
                  </Button>
                </div>
                <p className="text-xs ml-text-muted">
                  {t('languageRegion.applyToChainsHint')}
                </p>
              </div>

              <div className="grid max-w-md gap-1">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t('languageRegion.timezone')}
                </p>
                <GeneralSelect
                  aria-label={t('languageRegion.timezone')}
                  value={localization.timezone}
                  onChange={(value) => {
                    if (value) patchLocalization({ timezone: value });
                  }}
                >
                  {timezoneOptions.map((zone) => (
                    <SelectOption
                      key={zone}
                      id={zone}
                      label={formatCodedDisplayName(
                        formatTimezoneDisplayName(zone, displayLocale),
                        zone,
                      )}
                    />
                  ))}
                </GeneralSelect>
                <p className="text-xs ml-text-muted">
                  {t('languageRegion.timezoneHint')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid max-w-xs gap-1">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {tp('presentation.castCount')}
                </p>
                <GeneralSelect
                  aria-label={tp('presentation.castCount')}
                  value={
                    presentation.castCount === undefined
                      ? 'unlimited'
                      : String(presentation.castCount)
                  }
                  onChange={(value) => {
                    if (!value) return;
                    patchPresentation({
                      castCount:
                        value === 'unlimited'
                          ? undefined
                          : (Number(value) as PresentationConfig['castCount']),
                    });
                  }}
                >
                  {CAST_COUNT_OPTIONS.map((option) => {
                    const id =
                      option === 'unlimited' ? 'unlimited' : String(option);
                    const label =
                      option === 'unlimited'
                        ? tp('presentation.castCount.unlimited')
                        : tp('presentation.castCount.members', {
                            count: option,
                          });
                    return <SelectOption key={id} id={id} label={label} />;
                  })}
                </GeneralSelect>
                <p className="text-xs ml-text-muted">
                  {tp('presentation.castCountHint')}
                </p>
              </div>

              <div className="space-y-3">
                {(
                  [
                    [
                      'showAgeRatingInGenres',
                      'presentation.showAgeRatingInGenres',
                      'presentation.showAgeRatingInGenresHint',
                    ],
                    [
                      'catalogNamePrefix',
                      'presentation.catalogNamePrefix',
                      'presentation.catalogNamePrefixHint',
                    ],
                    [
                      'hideEpisodeSpoilers',
                      'presentation.hideEpisodeSpoilers',
                      'presentation.hideEpisodeSpoilersHint',
                    ],
                    [
                      'ratingPostersForLibrary',
                      'presentation.ratingPostersForLibrary',
                      'presentation.ratingPostersForLibraryHint',
                    ],
                  ] as const
                ).map(([field, labelKey, hintKey]) => (
                  <Checkbox
                    key={field}
                    isSelected={presentation[field]}
                    onChange={(isSelected) =>
                      patchPresentation({ [field]: isSelected })
                    }
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span>
                        <span className="font-medium text-[var(--foreground)]">
                          {tp(labelKey)}
                        </span>
                        <span className="mt-0.5 block text-xs ml-text-muted">
                          {tp(hintKey)}
                        </span>
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end items-center gap-3">
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
        </Card>
      ) : null}
    </section>
  );
}
