import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ensureStudioSession,
  fetchEffectiveRules,
  saveGlobalRules,
  type RuleSetDraft,
} from '@/lib/api';
import {
  Button,
  Card,
  Checkbox,
  Input,
  ListBox,
  Select,
} from '@metalayer/shared-ui';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';

const CERTIFICATION_NONE = '__none__';

const CERTIFICATION_OPTIONS = [
  CERTIFICATION_NONE,
  'G',
  'PG',
  'PG-13',
  'R',
  'NC-17',
] as const;

function parseCommaList(value: string): string[] | undefined {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function formatCommaList(items?: string[]): string {
  return items?.join(', ') ?? '';
}

/** Global catalog rules editor (AGENTS.md §13). */
export function GlobalRulesEditor() {
  const { t } = useTranslation(['rules', 'common']);
  const [rules, setRules] = useState<RuleSetDraft>({
    excludeAdult: true,
  });
  const [excludeGenresText, setExcludeGenresText] = useState('');
  const [excludeKeywordsText, setExcludeKeywordsText] = useState('');
  const [warnings, setWarnings] = useState<
    Array<{ rule: string; reason: string; fallback?: string }>
  >([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );

  function draftFromForm(): RuleSetDraft {
    return {
      ...rules,
      excludeGenres: parseCommaList(excludeGenresText),
      excludeKeywords: parseCommaList(excludeKeywordsText),
      maximumCertification:
        rules.maximumCertification &&
        rules.maximumCertification !== CERTIFICATION_NONE
          ? rules.maximumCertification
          : undefined,
    };
  }

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const effective = await fetchEffectiveRules(
        session.configId,
        session.editCredential,
      );
      const next = effective.effective;
      setRules({
        excludeAdult: next.excludeAdult ?? true,
        digitallyReleasedOnly: next.digitallyReleasedOnly,
        releasedOnly: next.releasedOnly,
        minimumRating: next.minimumRating,
        minimumVotes: next.minimumVotes,
        maximumCertification: next.maximumCertification,
      });
      setExcludeGenresText(formatCommaList(next.excludeGenres));
      setExcludeKeywordsText(formatCommaList(next.excludeKeywords));
      setWarnings(effective.warnings);
      setStatus('ready');
      setSaveState('idle');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave() {
    setSaveState('saving');
    try {
      const session = await ensureStudioSession();
      await saveGlobalRules(
        session.configId,
        session.editCredential,
        draftFromForm(),
      );
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  function patchRules(patch: Partial<RuleSetDraft>) {
    setRules((current) => ({ ...current, ...patch }));
    setSaveState('idle');
  }

  return (
    <div className="space-y-6">
      {status === 'loading' ? (
        <LoadingState label={t('rules.bootstrapping')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('rules.loadError')}
          retryLabel={t('state.retry', { ns: 'common' })}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <Card>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="space-y-6">
                <section className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground">
                    {t('rules.section.certification')}
                  </h2>
                  <p className="text-xs text-muted">
                    {t('rules.section.certificationHint')}
                  </p>
                  <Select
                    aria-label={t('rules.maximumCertification')}
                    placeholder={t('rules.certification.none')}
                    value={rules.maximumCertification ?? CERTIFICATION_NONE}
                    onChange={(key) => {
                      const value = key == null ? null : String(key);
                      patchRules({
                        maximumCertification:
                          !value || value === CERTIFICATION_NONE
                            ? undefined
                            : value,
                      });
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CERTIFICATION_OPTIONS.map((option) => {
                          const label =
                            option === CERTIFICATION_NONE
                              ? t('rules.certification.none')
                              : t(`rules.certification.${option}`, {
                                  defaultValue: option,
                                });
                          return (
                            <ListBox.Item
                              key={option}
                              id={option}
                              textValue={label}
                            >
                              {label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </section>

                <section className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground">
                    {t('rules.section.adult')}
                  </h2>
                  <p className="text-xs text-muted">
                    {t('rules.section.adultHint')}
                  </p>
                  <Checkbox
                    isSelected={Boolean(rules.excludeAdult)}
                    onChange={(isSelected) =>
                      patchRules({ excludeAdult: isSelected })
                    }
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-sm text-foreground">
                        {t('rules.excludeAdult')}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                </section>

                <section className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground">
                    {t('rules.section.digitalRelease')}
                  </h2>
                  <p className="text-xs text-muted">
                    {t('rules.section.digitalReleaseHint')}
                  </p>
                  <Checkbox
                    isSelected={Boolean(rules.digitallyReleasedOnly)}
                    onChange={(isSelected) =>
                      patchRules({ digitallyReleasedOnly: isSelected })
                    }
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-sm text-foreground">
                        {t('rules.digitallyReleasedOnly')}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                </section>

                <section className="space-y-2">
                  <h2 className="text-sm font-medium text-foreground">
                    {t('rules.section.unreleased')}
                  </h2>
                  <p className="text-xs text-muted">
                    {t('rules.section.unreleasedHint')}
                  </p>
                  <Checkbox
                    isSelected={Boolean(rules.releasedOnly)}
                    onChange={(isSelected) =>
                      patchRules({ releasedOnly: isSelected })
                    }
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-sm text-foreground">
                        {t('rules.releasedOnly')}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                </section>
              </div>

              <div className="space-y-6">
                <section className="space-y-3">
                  <h2 className="text-sm font-medium text-foreground">
                    {t('rules.section.quality')}
                  </h2>
                  <label className="grid gap-1 text-sm text-foreground">
                    <span>{t('rules.minimumRating')}</span>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      aria-describedby="global-rules-rating-hint"
                      value={rules.minimumRating ?? ''}
                      onChange={(event) =>
                        patchRules({
                          minimumRating: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        })
                      }
                    />
                    <span
                      id="global-rules-rating-hint"
                      className="text-xs text-muted"
                    >
                      {t('rules.minimumRatingHint')}
                    </span>
                  </label>
                  <label className="grid gap-1 text-sm text-foreground">
                    <span>{t('rules.minimumVotes')}</span>
                    <Input
                      type="number"
                      min={0}
                      aria-describedby="global-rules-votes-hint"
                      value={rules.minimumVotes ?? ''}
                      onChange={(event) =>
                        patchRules({
                          minimumVotes: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        })
                      }
                    />
                    <span
                      id="global-rules-votes-hint"
                      className="text-xs text-muted"
                    >
                      {t('rules.minimumVotesHint')}
                    </span>
                  </label>
                </section>

                <section className="space-y-3">
                  <h2 className="text-sm font-medium text-foreground">
                    {t('rules.section.exclusion')}
                  </h2>
                  <p className="text-xs text-muted">
                    {t('rules.section.exclusionHint')}
                  </p>
                  <label className="grid gap-1 text-sm text-foreground">
                    <span>{t('rules.excludeGenres')}</span>
                    <Input
                      value={excludeGenresText}
                      onChange={(event) => {
                        setExcludeGenresText(event.target.value);
                        setSaveState('idle');
                      }}
                      placeholder={t('rules.excludeGenresPlaceholder')}
                      aria-describedby="global-rules-genres-hint"
                    />
                    <span
                      id="global-rules-genres-hint"
                      className="text-xs text-muted"
                    >
                      {t('rules.excludeGenresHint')}
                    </span>
                  </label>
                  <label className="grid gap-1 text-sm text-foreground">
                    <span>{t('rules.excludeKeywords')}</span>
                    <Input
                      value={excludeKeywordsText}
                      onChange={(event) => {
                        setExcludeKeywordsText(event.target.value);
                        setSaveState('idle');
                      }}
                      placeholder={t('rules.excludeKeywordsPlaceholder')}
                      aria-describedby="global-rules-keywords-hint"
                    />
                    <span
                      id="global-rules-keywords-hint"
                      className="text-xs text-muted"
                    >
                      {t('rules.excludeKeywordsHint')}
                    </span>
                  </label>
                </section>
              </div>
            </div>

            {saveState === 'ok' ? (
              <p className="text-sm text-success" role="status">
                {t('rules.saved')}
              </p>
            ) : null}
            {saveState === 'error' ? (
              <p className="text-sm text-danger" role="alert">
                {t('rules.saveError')}
              </p>
            ) : null}

            {warnings.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('rules.warnings')}
                </p>
                <ul className="space-y-1 text-sm text-warning" role="status">
                  {warnings.map((warning) => {
                    const ruleLabel = t(`rules.rule.${warning.rule}`, {
                      defaultValue: warning.rule,
                    });
                    const reasonLabel = t(`rules.warning.${warning.reason}`, {
                      defaultValue: warning.reason,
                    });
                    const fallbackLabel = warning.fallback
                      ? t(`rules.fallback.${warning.fallback}`, {
                          defaultValue: warning.fallback,
                        })
                      : null;
                    return (
                      <li key={`${warning.rule}-${warning.reason}`}>
                        {ruleLabel}: {reasonLabel}
                        {fallbackLabel ? ` (${fallbackLabel})` : ''}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onPress={() => {
                  void onSave();
                }}
                isDisabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? t('rules.saving') : t('rules.save')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
