import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldResolutionPlan, ResolutionConfig } from '@metalayer/config';
import { Button } from '@metalayer/shared-ui';
import {
  ensureStudioSession,
  fetchResolutionConfig,
  saveResolutionConfig,
} from '@/lib/api';
import {
  APPEARANCE_EDIT_FIELDS,
  ensureAppearancePlan,
  isArtworkField,
  type AppearanceEditField,
} from '@/lib/appearance-plans';
import { PageActions } from '@/components/metalayer/PageHeader';
import { usePageHeader } from '@/contexts/page-title';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { ResolutionChainBuilder } from '@/components/metalayer/ResolutionChainBuilder';

export function AppearancePage() {
  const { t } = useTranslation(['resolution', 'common']);
  usePageHeader(t('nav.appearance', { ns: 'common' }), t('resolution.intro'));
  const [resolution, setResolution] = useState<ResolutionConfig | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const result = await fetchResolutionConfig(
        session.configId,
        session.editCredential,
      );
      const next = { ...result.resolution };
      next.defaults = {
        fields: { ...next.defaults.fields },
      };
      for (const field of APPEARANCE_EDIT_FIELDS) {
        next.defaults.fields[field] = ensureAppearancePlan(next, field);
      }
      setResolution(next);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateField(field: AppearanceEditField, plan: FieldResolutionPlan) {
    setResolution((current) => {
      if (!current) return current;
      return {
        ...current,
        defaults: {
          ...current.defaults,
          fields: {
            ...current.defaults.fields,
            [field]: plan,
          },
        },
      };
    });
    setSaveState('idle');
  }

  async function onSave() {
    if (!resolution) return;
    setSaveState('saving');
    try {
      const session = await ensureStudioSession();
      await saveResolutionConfig(
        session.configId,
        session.editCredential,
        resolution,
      );
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  return (
    <section className="space-y-6">
      <PageActions>
        <Button
          type="button"
          onPress={() => {
            void onSave();
          }}
          isDisabled={!resolution || saveState === 'saving'}
        >
          {saveState === 'saving' ? t('resolution.saving') : t('resolution.save')}
        </Button>
      </PageActions>

      {status === 'loading' ? (
        <LoadingState label={t('resolution.loading')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('resolution.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {saveState === 'ok' ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {t('resolution.saveOk')}
        </p>
      ) : null}
      {saveState === 'error' ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {t('resolution.saveError')}
        </p>
      ) : null}

      {resolution
        ? APPEARANCE_EDIT_FIELDS.map((field) => (
            <ResolutionChainBuilder
              key={field}
              fieldLabel={t(`resolution.field.${field}`)}
              value={ensureAppearancePlan(resolution, field)}
              onChange={(plan) => updateField(field, plan)}
              providerOptions={
                isArtworkField(field)
                  ? [
                      'rpdb',
                      'topposters',
                      'aioratings',
                      'openposterdb',
                      'fanart',
                      'tmdb',
                      'tvdb',
                    ]
                  : ['tmdb', 'tvdb', 'imdb']
              }
              allowLocales
            />
          ))
        : null}
    </section>
  );
}
