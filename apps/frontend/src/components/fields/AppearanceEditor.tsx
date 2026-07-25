import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldResolutionPlan, ResolutionConfig } from '@metalayer/config';
import { Button, toast } from '@metalayer/shared-ui';
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
} from '@/lib/field-plans';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { ResolutionChainBuilder } from '@/components/fields/ResolutionChainBuilder';

/** Appearance field chains embedded in Metas → Fields (General). */
export function AppearanceEditor() {
  const { t } = useTranslation(['resolution', 'common']);
  const [resolution, setResolution] = useState<ResolutionConfig | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);

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
  }

  async function onSave() {
    if (!resolution) return;
    setSaving(true);
    try {
      const session = await ensureStudioSession();
      await saveResolutionConfig(
        session.configId,
        session.editCredential,
        resolution,
      );
      toast.success(t('resolution.saveOk'));
    } catch {
      toast.danger(t('resolution.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm ml-text-muted">{t('resolution.appearanceIntro')}</p>
        <Button
          type="button"
          onPress={() => {
            void onSave();
          }}
          isDisabled={!resolution || saving}
        >
          {saving ? t('resolution.saving') : t('resolution.save')}
        </Button>
      </div>

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
