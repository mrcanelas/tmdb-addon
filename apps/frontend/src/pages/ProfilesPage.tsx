import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileDefinition } from '@metalayer/config';
import { Button } from '@metalayer/shared-ui';
import {
  ensureStudioSession,
  fetchProfiles,
  saveProfiles,
} from '@/lib/api';
import { usePageHeader } from '@/contexts/page-title';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

const SELECT_CLASS =
  'h-10 rounded-md border border-[var(--ml-border)] bg-[var(--ml-surface)] px-3 text-[var(--ml-text)]';

function newProfileId(): string {
  return `prf_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function profileManifestUrl(configId: string, profileId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/c/${configId}/p/${profileId}/manifest.json`;
}

export function ProfilesPage() {
  const { t } = useTranslation(['profiles', 'common']);
  usePageHeader(t('profiles.title'), t('profiles.intro'));
  const [configId, setConfigId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileDefinition[]>([]);
  const [draftName, setDraftName] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const result = await fetchProfiles(
        session.configId,
        session.editCredential,
      );
      setConfigId(session.configId);
      setProfiles(result.profiles);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(next: ProfileDefinition[]) {
    setSaveState('saving');
    try {
      const session = await ensureStudioSession();
      const saved = await saveProfiles(
        session.configId,
        session.editCredential,
        next,
      );
      setProfiles(saved.profiles);
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  }

  async function onCreate() {
    const name = draftName.trim() || t('profiles.defaultName');
    const profile: ProfileDefinition = {
      profileId: newProfileId(),
      name,
      enabled: true,
    };
    setDraftName('');
    await persist([...profiles, profile]);
  }

  async function onRename(profileId: string, name: string) {
    await persist(
      profiles.map((profile) =>
        profile.profileId === profileId ? { ...profile, name } : profile,
      ),
    );
  }

  async function onDelete(profileId: string) {
    await persist(profiles.filter((profile) => profile.profileId !== profileId));
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('ok');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <section className="space-y-6">
      {status === 'loading' ? (
        <LoadingState label={t('profiles.loading')} />
      ) : null}

      {status === 'error' ? (
        <ErrorState
          message={t('profiles.loadError')}
          retryLabel={t('common:state.retry')}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {status === 'ready' ? (
        <>
          <SectionCard title={t('profiles.create')}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-[12rem] flex-1 gap-1 text-sm text-[var(--ml-text)]">
                <span>{t('profiles.name')}</span>
                <input
                  className={`${SELECT_CLASS} w-full`}
                  value={draftName}
                  placeholder={t('profiles.namePlaceholder')}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </label>
              <Button
                type="button"
                onPress={() => {
                  void onCreate();
                }}
                isDisabled={saveState === 'saving'}
              >
                {t('profiles.add')}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t('profiles.list')}>
            {profiles.length === 0 ? (
              <EmptyState title={t('profiles.empty')} />
            ) : (
              <ul className="space-y-4">
                {profiles.map((profile) => {
                  const url =
                    configId
                      ? profileManifestUrl(configId, profile.profileId)
                      : '';
                  return (
                    <li
                      key={profile.profileId}
                      className="space-y-2 border-b border-[var(--ml-border)] pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="grid min-w-[12rem] flex-1 gap-1 text-sm text-[var(--ml-text)]">
                          <span>{t('profiles.name')}</span>
                          <input
                            className={`${SELECT_CLASS} w-full`}
                            defaultValue={profile.name}
                            onBlur={(event) => {
                              const name = event.target.value.trim();
                              if (name && name !== profile.name) {
                                void onRename(profile.profileId, name);
                              }
                            }}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onPress={() => {
                            void onDelete(profile.profileId);
                          }}
                        >
                          {t('profiles.delete')}
                        </Button>
                      </div>
                      <p className="break-all font-mono text-xs ml-text-muted">
                        {url}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        onPress={() => {
                          void copyUrl(url);
                        }}
                      >
                        {t('profiles.copyManifest')}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {saveState === 'ok' ? (
            <p className="text-sm text-[var(--ml-text)]" role="status">
              {t('profiles.saveOk')}
            </p>
          ) : null}
          {saveState === 'error' ? (
            <p className="text-sm text-[var(--ml-error)]" role="alert">
              {t('profiles.saveError')}
            </p>
          ) : null}
          {copyState === 'ok' ? (
            <p className="text-sm text-[var(--ml-text)]" role="status">
              {t('profiles.copyOk')}
            </p>
          ) : null}
          {copyState === 'error' ? (
            <p className="text-sm text-[var(--ml-error)]" role="alert">
              {t('profiles.copyError')}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
