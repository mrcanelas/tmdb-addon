import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@metalayer/shared-ui';
import {
  type DashboardProviderState,
  fetchProviders,
  updateProvider,
  updateProviderSecret,
} from '@/lib/api';

type SecretKind = 'api_key' | 'client_id' | 'client_secret';
const SECRET_KINDS: SecretKind[] = ['api_key', 'client_id', 'client_secret'];

export function ProvidersPage() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [providers, setProviders] = useState<DashboardProviderState[]>([]);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchProviders();
        if (!cancelled) {
          setProviders(result.providers);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(provider: DashboardProviderState) {
    const previous = providers;
    const next = { ...provider, enabled: !provider.enabled, source: 'admin' as const };
    setProviders((items) => items.map((item) => (item.id === provider.id ? next : item)));
    try {
      const result = await updateProvider(provider.id, { enabled: next.enabled });
      setProviders((items) =>
        items.map((item) => (item.id === provider.id ? result.provider : item)),
      );
    } catch {
      setProviders(previous);
    }
  }

  async function saveSecret(provider: DashboardProviderState, kind: SecretKind) {
    const key = `${provider.id}:${kind}`;
    const plaintext = secretDrafts[key]?.trim();
    if (!plaintext) return;
    const result = await updateProviderSecret(provider.id, kind, plaintext);
    setProviders((items) =>
      items.map((item) => (item.id === provider.id ? result.provider : item)),
    );
    setSecretDrafts((drafts) => ({ ...drafts, [key]: '' }));
  }

  return (
    <section className="ml-surface p-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {t('dashboard.providersTitle')}
      </h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.providersIntro')}</p>

      {status === 'loading' ? (
        <p className="ml-text-muted mt-4 text-sm">{t('dashboard.loading')}</p>
      ) : null}
      {status === 'error' ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}

      {status === 'ready' ? (
        <div className="mt-4 divide-y divide-border overflow-hidden rounded border border-border">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <strong className="block text-foreground">{provider.id}</strong>
                <span className="ml-text-muted text-sm">
                  {t(`dashboard.provider.source.${provider.source}`)}
                </span>
              </div>
              <span className="text-sm text-foreground">
                {provider.configured
                  ? t('dashboard.provider.configured')
                  : t('dashboard.provider.notConfigured')}
              </span>
              <Button
                size="sm"
                variant={provider.enabled ? 'outline' : 'primary'}
                onPress={() => {
                  void toggle(provider);
                }}
              >
                {provider.enabled
                  ? t('dashboard.provider.disable')
                  : t('dashboard.provider.enable')}
              </Button>
              <div className="sm:col-span-3">
                <div className="grid gap-2 md:grid-cols-3">
                  {SECRET_KINDS.map((kind) => {
                    const key = `${provider.id}:${kind}`;
                    return (
                      <form
                        key={kind}
                        className="flex gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveSecret(provider, kind);
                        }}
                      >
                        <label className="min-w-0 flex-1">
                          <span className="sr-only">
                            {t(`dashboard.provider.secret.${kind}`)}
                          </span>
                          <input
                            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
                            type="password"
                            autoComplete="off"
                            value={secretDrafts[key] ?? ''}
                            placeholder={t(`dashboard.provider.secret.${kind}`)}
                            onChange={(event) =>
                              setSecretDrafts((drafts) => ({
                                ...drafts,
                                [key]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <Button size="sm" type="submit">
                          {t('dashboard.provider.secret.save')}
                        </Button>
                      </form>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
