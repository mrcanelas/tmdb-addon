import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import type { FieldResolutionPlan, LocalePreference } from '@metalayer/config';
import { SectionCard } from '@/components/metalayer/SectionCard';

export interface ResolutionChainBuilderProps {
  fieldLabel: string;
  value: FieldResolutionPlan;
  onChange: (value: FieldResolutionPlan) => void;
  providerOptions: string[];
  allowLocales?: boolean;
}

function localeLabel(
  locale: LocalePreference,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  switch (locale.type) {
    case 'locale':
      return locale.value;
    case 'original-language':
      return t('resolution.locale.original');
    case 'no-language':
      return t('resolution.locale.noLanguage');
    case 'any-language':
      return t('resolution.locale.any');
    case 'provider-default':
      return t('resolution.locale.providerDefault');
    default:
      return t('resolution.locale.unknown');
  }
}

function moveItem<T>(list: T[], from: number, direction: -1 | 1): T[] {
  const to = from + direction;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Minimal Simple-mode Field Resolution Chain editor (AGENTS.md §10.17). */
export function ResolutionChainBuilder({
  fieldLabel,
  value,
  onChange,
  providerOptions,
  allowLocales = true,
}: ResolutionChainBuilderProps) {
  const { t } = useTranslation('resolution');

  const providers = useMemo(
    () => value.providers ?? [],
    [value.providers],
  );
  const locales = useMemo(() => value.locales ?? [], [value.locales]);

  const effectivePreview = useMemo(() => {
    if (value.strategy === 'explicit' && value.steps) {
      return value.steps.map((step) => {
        const locale =
          step.locale && 'value' in step.locale
            ? step.locale.value
            : step.locale?.type ?? 'any';
        return `${step.provider} · ${locale}`;
      });
    }
    const rows: string[] = [];
    if (value.strategy === 'locale-first') {
      for (const locale of locales) {
        for (const provider of providers) {
          rows.push(`${provider} · ${localeLabel(locale, t)}`);
        }
      }
    } else {
      for (const provider of providers) {
        for (const locale of locales.length ? locales : [{ type: 'any-language' as const }]) {
          rows.push(`${provider} · ${localeLabel(locale, t)}`);
        }
      }
    }
    return rows;
  }, [value, providers, locales, t]);

  function setStrategy(strategy: FieldResolutionPlan['strategy']) {
    onChange({ ...value, strategy });
  }

  function addProvider(provider: string) {
    if (providers.includes(provider)) return;
    onChange({ ...value, providers: [...providers, provider] });
  }

  function addLocale(locale: LocalePreference) {
    onChange({ ...value, locales: [...locales, locale] });
  }

  return (
    <SectionCard title={fieldLabel} description={t('resolution.builderIntro')}>
      <div className="space-y-4">
        <div
          className="inline-flex rounded-md border border-[var(--border)] p-0.5"
          role="group"
          aria-label={t('resolution.strategyAria')}
        >
          {(
            [
              ['locale-first', 'resolution.strategy.localeFirst'],
              ['provider-first', 'resolution.strategy.providerFirst'],
              ['explicit', 'resolution.strategy.explicit'],
            ] as const
          ).map(([strategy, labelKey]) => (
            <Button
              key={strategy}
              type="button"
              size="sm"
              variant={value.strategy === strategy ? 'primary' : 'ghost'}
              aria-pressed={value.strategy === strategy}
              onPress={() => setStrategy(strategy)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>

        {allowLocales && value.strategy !== 'explicit' ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {t('resolution.locales')}
            </p>
            <ul className="space-y-1">
              {locales.map((locale, index) => {
                const label = localeLabel(locale, t);
                return (
                  <li
                    key={`${locale.type}-${'value' in locale ? locale.value : index}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="text-[var(--foreground)]">{label}</span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isIconOnly
                        aria-label={t('resolution.moveUpNamed', { item: label })}
                        onPress={() =>
                          onChange({
                            ...value,
                            locales: moveItem(locales, index, -1),
                          })
                        }
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isIconOnly
                        aria-label={t('resolution.moveDownNamed', { item: label })}
                        onPress={() =>
                          onChange({
                            ...value,
                            locales: moveItem(locales, index, 1),
                          })
                        }
                      >
                        ↓
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t('resolution.addLocale', { locale: 'pt-BR' })}
                onPress={() => addLocale({ type: 'locale', value: 'pt-BR' })}
              >
                {t('resolution.addLocale', { locale: 'pt-BR' })}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t('resolution.addLocale', { locale: 'en-US' })}
                onPress={() => addLocale({ type: 'locale', value: 'en-US' })}
              >
                {t('resolution.addLocale', { locale: 'en-US' })}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t('resolution.addLocale', {
                  locale: t('resolution.locale.original'),
                })}
                onPress={() => addLocale({ type: 'original-language' })}
              >
                {t('resolution.addLocale', {
                  locale: t('resolution.locale.original'),
                })}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t('resolution.addLocale', {
                  locale: t('resolution.locale.noLanguage'),
                })}
                onPress={() => addLocale({ type: 'no-language' })}
              >
                {t('resolution.addLocale', {
                  locale: t('resolution.locale.noLanguage'),
                })}
              </Button>
            </div>
          </div>
        ) : null}

        {value.strategy !== 'explicit' ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {t('resolution.providers')}
            </p>
            <ul className="space-y-1">
              {providers.map((provider, index) => (
                <li
                  key={provider}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-[var(--foreground)]">{provider}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isIconOnly
                      aria-label={t('resolution.moveUpNamed', { item: provider })}
                      onPress={() =>
                        onChange({
                          ...value,
                          providers: moveItem(providers, index, -1),
                        })
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isIconOnly
                      aria-label={t('resolution.moveDownNamed', { item: provider })}
                      onPress={() =>
                        onChange({
                          ...value,
                          providers: moveItem(providers, index, 1),
                        })
                      }
                    >
                      ↓
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {providerOptions.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  size="sm"
                  variant="outline"
                  isDisabled={providers.includes(provider)}
                  aria-label={t('resolution.addProvider', { provider })}
                  onPress={() => addProvider(provider)}
                >
                  {t('resolution.addProvider', { provider })}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm ml-text-muted">{t('resolution.explicitHint')}</p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {t('resolution.effectiveOrder')}
          </p>
          <ol className="list-decimal space-y-1 ps-5 text-sm ml-text-muted">
            {effectivePreview.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ol>
        </div>
      </div>
    </SectionCard>
  );
}
