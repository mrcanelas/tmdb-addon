import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CatalogDefinition,
  ProfileDefinition,
  RuleSet,
  SortingPlan,
  PresentationConfig,
} from '@metalayer/config';
import { Button, Tabs } from '@metalayer/shared-ui';
import {
  ensureStudioSession,
  fetchCatalogs,
  fetchProfiles,
  saveProfiles,
} from '@/lib/api';
import { randomId } from '@/lib/random-id';
import { usePageHeader } from '@/contexts/page-title';
import { SectionCard } from '@/components/metalayer/SectionCard';
import { LoadingState } from '@/components/metalayer/LoadingState';
import { ErrorState } from '@/components/metalayer/ErrorState';
import { EmptyState } from '@/components/metalayer/EmptyState';

const SELECT_CLASS =
  'h-10 rounded-md border border-border bg-surface px-3 text-foreground';
const INPUT_CLASS =
  'h-10 w-full rounded-md border border-border bg-surface px-3 text-foreground';

type ProfileTab =
  | 'general'
  | 'locale'
  | 'catalogs'
  | 'rules'
  | 'sorting'
  | 'appearance'
  | 'tracking';

const TRACKING_OPTIONS = ['trakt', 'simkl', 'anilist', 'mal'] as const;

function newProfileId(): string {
  return `prf_${randomId(6)}`;
}

function profileManifestUrl(configId: string, profileId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/c/${configId}/p/${profileId}/manifest.json`;
}

function updateProfile(
  profiles: ProfileDefinition[],
  profileId: string,
  patch: Partial<ProfileDefinition>,
): ProfileDefinition[] {
  return profiles.map((profile) =>
    profile.profileId === profileId ? { ...profile, ...patch } : profile,
  );
}

export function ProfilesPage() {
  const { t } = useTranslation(['profiles', 'common']);
  usePageHeader(t('profiles.title'), t('profiles.intro'));
  const [configId, setConfigId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileDefinition[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('general');
  const [draftName, setDraftName] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'ok' | 'error'>(
    'idle',
  );
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');

  const selected = useMemo(
    () => profiles.find((profile) => profile.profileId === selectedId) ?? null,
    [profiles, selectedId],
  );

  async function load() {
    setStatus('loading');
    try {
      const session = await ensureStudioSession();
      const [profileResult, catalogResult] = await Promise.all([
        fetchProfiles(session.configId, session.editCredential),
        fetchCatalogs(session.configId, session.editCredential),
      ]);
      setConfigId(session.configId);
      setProfiles(profileResult.profiles);
      setCatalogs(catalogResult.catalogs as CatalogDefinition[]);
      setSelectedId((current) => current ?? profileResult.profiles[0]?.profileId ?? null);
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
    const next = [...profiles, profile];
    setSelectedId(profile.profileId);
    await persist(next);
  }

  async function patchSelected(patch: Partial<ProfileDefinition>) {
    if (!selected) return;
    const next = updateProfile(profiles, selected.profileId, patch);
    setProfiles(next);
    await persist(next);
  }

  async function onDelete(profileId: string) {
    const next = profiles.filter((profile) => profile.profileId !== profileId);
    if (selectedId === profileId) {
      setSelectedId(next[0]?.profileId ?? null);
    }
    await persist(next);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('ok');
    } catch {
      setCopyState('error');
    }
  }

  function patchRules(partial: Partial<RuleSet>) {
    if (!selected) return;
    void patchSelected({
      rules: { ...(selected.rules ?? {}), ...partial },
    });
  }

  function patchPresentation(partial: Partial<PresentationConfig>) {
    if (!selected) return;
    void patchSelected({
      presentation: { ...(selected.presentation ?? {}), ...partial },
    });
  }

  const url =
    configId && selected
      ? profileManifestUrl(configId, selected.profileId)
      : '';

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
              <label className="grid min-w-[12rem] flex-1 gap-1 text-sm text-foreground">
                <span>{t('profiles.name')}</span>
                <input
                  className={INPUT_CLASS}
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

          {profiles.length === 0 ? (
            <EmptyState title={t('profiles.empty')} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
              <SectionCard title={t('profiles.list')}>
                <ul className="space-y-1">
                  {profiles.map((profile) => (
                    <li key={profile.profileId}>
                      <button
                        type="button"
                        className={`w-full rounded-md px-3 py-2 text-start text-sm ${
                          selectedId === profile.profileId
                            ? 'bg-accent/15 text-foreground'
                            : 'text-foreground hover:bg-surface-secondary'
                        }`}
                        onClick={() => setSelectedId(profile.profileId)}
                      >
                        {profile.name}
                        {!profile.enabled ? (
                          <span className="ml-text-muted ml-2 text-xs">
                            ({t('profiles.disabled')})
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {selected ? (
                <SectionCard title={selected.name}>
                  <Tabs
                    selectedKey={tab}
                    onSelectionChange={(key) => setTab(String(key) as ProfileTab)}
                    className="mb-4"
                  >
                    <Tabs.ListContainer>
                      <Tabs.List aria-label={t('profiles.tabs.aria')}>
                        {(
                          [
                            'general',
                            'locale',
                            'catalogs',
                            'rules',
                            'sorting',
                            'appearance',
                            'tracking',
                          ] as const
                        ).map((id) => (
                          <Tabs.Tab key={id} id={id} className="px-2 sm:px-3">
                            {t(`profiles.tabs.${id}`)}
                            <Tabs.Indicator />
                          </Tabs.Tab>
                        ))}
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>

                  {tab === 'general' ? (
                    <div className="grid gap-3">
                      <label className="grid gap-1 text-sm">
                        <span>{t('profiles.name')}</span>
                        <input
                          className={INPUT_CLASS}
                          value={selected.name}
                          onChange={(event) =>
                            setProfiles(
                              updateProfile(profiles, selected.profileId, {
                                name: event.target.value,
                              }),
                            )
                          }
                          onBlur={(event) => {
                            const name = event.target.value.trim();
                            if (name && name !== selected.name) {
                              void patchSelected({ name });
                            }
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.enabled}
                          onChange={(event) => {
                            void patchSelected({ enabled: event.target.checked });
                          }}
                        />
                        {t('profiles.enabled')}
                      </label>
                      <p className="break-all font-mono text-xs ml-text-muted">{url}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            void copyUrl(url);
                          }}
                        >
                          {t('profiles.copyManifest')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onPress={() => {
                            void onDelete(selected.profileId);
                          }}
                        >
                          {t('profiles.delete')}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {tab === 'locale' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ['interfaceLocale', 'profiles.locale.interface'],
                          ['metadataLocale', 'profiles.locale.metadata'],
                          ['contentRegion', 'profiles.locale.contentRegion'],
                          ['timezone', 'profiles.locale.timezone'],
                        ] as const
                      ).map(([field, labelKey]) => (
                        <label key={field} className="grid gap-1 text-sm">
                          <span>{t(labelKey)}</span>
                          <input
                            className={INPUT_CLASS}
                            value={selected.localization?.[field] ?? ''}
                            placeholder={t('profiles.locale.inherit')}
                            onBlur={(event) => {
                              const value = event.target.value.trim();
                              void patchSelected({
                                localization: {
                                  ...(selected.localization ?? {}),
                                  [field]: value || undefined,
                                },
                              });
                            }}
                            onChange={(event) =>
                              setProfiles(
                                updateProfile(profiles, selected.profileId, {
                                  localization: {
                                    ...(selected.localization ?? {}),
                                    [field]: event.target.value,
                                  },
                                }),
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {tab === 'catalogs' ? (
                    <ul className="space-y-2">
                      {catalogs.length === 0 ? (
                        <li className="ml-text-muted text-sm">
                          {t('profiles.catalogs.empty')}
                        </li>
                      ) : (
                        catalogs.map((catalog) => {
                          const checked =
                            !selected.catalogInstanceIds ||
                            selected.catalogInstanceIds.includes(catalog.instanceId);
                          return (
                            <li key={catalog.instanceId}>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const current =
                                      selected.catalogInstanceIds ??
                                      catalogs.map((item) => item.instanceId);
                                    const nextIds = event.target.checked
                                      ? [...new Set([...current, catalog.instanceId])]
                                      : current.filter((id) => id !== catalog.instanceId);
                                    void patchSelected({
                                      catalogInstanceIds:
                                        nextIds.length === catalogs.length
                                          ? undefined
                                          : nextIds,
                                    });
                                  }}
                                />
                                {catalog.customName ??
                                  catalog.name?.default ??
                                  catalog.originalName}
                              </label>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}

                  {tab === 'rules' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span>{t('profiles.rules.minimumRating')}</span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          className={INPUT_CLASS}
                          value={selected.rules?.minimumRating ?? ''}
                          onBlur={(event) => {
                            const value = event.target.value;
                            patchRules({
                              minimumRating: value === '' ? undefined : Number(value),
                            });
                          }}
                          onChange={(event) =>
                            setProfiles(
                              updateProfile(profiles, selected.profileId, {
                                rules: {
                                  ...(selected.rules ?? {}),
                                  minimumRating:
                                    event.target.value === ''
                                      ? undefined
                                      : Number(event.target.value),
                                },
                              }),
                            )
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span>{t('profiles.rules.yearFrom')}</span>
                        <input
                          type="number"
                          className={INPUT_CLASS}
                          value={selected.rules?.yearFrom ?? ''}
                          onBlur={(event) => {
                            const value = event.target.value;
                            patchRules({
                              yearFrom: value === '' ? undefined : Number(value),
                            });
                          }}
                          onChange={(event) =>
                            setProfiles(
                              updateProfile(profiles, selected.profileId, {
                                rules: {
                                  ...(selected.rules ?? {}),
                                  yearFrom:
                                    event.target.value === ''
                                      ? undefined
                                      : Number(event.target.value),
                                },
                              }),
                            )
                          }
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.rules?.hideWatched)}
                          onChange={(event) =>
                            patchRules({ hideWatched: event.target.checked || undefined })
                          }
                        />
                        {t('profiles.rules.hideWatched')}
                      </label>
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.rules?.excludeAdult)}
                          onChange={(event) =>
                            patchRules({ excludeAdult: event.target.checked || undefined })
                          }
                        />
                        {t('profiles.rules.excludeAdult')}
                      </label>
                    </div>
                  ) : null}

                  {tab === 'sorting' ? (
                    <div className="grid gap-3">
                      <p className="ml-text-muted text-sm">{t('profiles.sorting.hint')}</p>
                      <label className="grid gap-1 text-sm">
                        <span>{t('profiles.sorting.primary')}</span>
                        <select
                          className={SELECT_CLASS}
                          value={selected.sorting?.criteria[0]?.field ?? ''}
                          onChange={(event) => {
                            const field = event.target.value;
                            if (!field) {
                              void patchSelected({ sorting: undefined });
                              return;
                            }
                            const plan: SortingPlan = {
                              criteria: [
                                {
                                  field: field as SortingPlan['criteria'][number]['field'],
                                  direction: 'desc',
                                },
                              ],
                              stable: true,
                            };
                            void patchSelected({ sorting: plan });
                          }}
                        >
                          <option value="">{t('profiles.sorting.inherit')}</option>
                          <option value="sourceOrder">sourceOrder</option>
                          <option value="popularity">popularity</option>
                          <option value="rating">rating</option>
                          <option value="title">title</option>
                          <option value="releaseDate">releaseDate</option>
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {tab === 'appearance' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        <span>{t('profiles.appearance.castLimit')}</span>
                        <select
                          className={SELECT_CLASS}
                          value={selected.presentation?.castCount ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            patchPresentation({
                              castCount: value
                                ? (Number(value) as 0 | 5 | 10 | 15)
                                : undefined,
                            });
                          }}
                        >
                          <option value="">{t('profiles.sorting.inherit')}</option>
                          <option value="0">0</option>
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="15">15</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.presentation?.catalogNamePrefix)}
                          onChange={(event) =>
                            patchPresentation({
                              catalogNamePrefix: event.target.checked || undefined,
                            })
                          }
                        />
                        {t('profiles.appearance.catalogNamePrefix')}
                      </label>
                    </div>
                  ) : null}

                  {tab === 'tracking' ? (
                    <label className="grid max-w-sm gap-1 text-sm">
                      <span>{t('profiles.tracking.provider')}</span>
                      <select
                        className={SELECT_CLASS}
                        value={selected.trackingProvider ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          void patchSelected({
                            trackingProvider: value
                              ? (value as ProfileDefinition['trackingProvider'])
                              : undefined,
                          });
                        }}
                      >
                        <option value="">{t('profiles.tracking.inherit')}</option>
                        {TRACKING_OPTIONS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </SectionCard>
              ) : null}
            </div>
          )}

          {saveState === 'ok' ? (
            <p className="text-sm text-foreground" role="status">
              {t('profiles.saveOk')}
            </p>
          ) : null}
          {saveState === 'error' ? (
            <p className="text-sm text-danger" role="alert">
              {t('profiles.saveError')}
            </p>
          ) : null}
          {copyState === 'ok' ? (
            <p className="text-sm text-foreground" role="status">
              {t('profiles.copyOk')}
            </p>
          ) : null}
          {copyState === 'error' ? (
            <p className="text-sm text-danger" role="alert">
              {t('profiles.copyError')}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
