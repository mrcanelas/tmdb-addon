import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchSettings,
  updateSetting,
  clearSetting,
  type RuntimeSettingView,
} from '@/lib/api';

export function SettingsPage() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchSettings>> | null>(
    null,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setStatus('loading');
    try {
      const result = await fetchSettings();
      setData(result);
      const nextDrafts: Record<string, string> = {};
      for (const setting of result.settings) {
        if (setting.secret) {
          nextDrafts[setting.key] = '';
        } else if (setting.value === null || setting.value === undefined) {
          nextDrafts[setting.key] = '';
        } else {
          nextDrafts[setting.key] = String(setting.value);
        }
      }
      setDrafts(nextDrafts);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onSave(setting: RuntimeSettingView) {
    setBusyKey(setting.key);
    setMessage(null);
    try {
      const raw = drafts[setting.key] ?? '';
      let value: unknown = raw;
      if (setting.type === 'boolean') {
        value = raw === 'true' || raw === '1';
      } else if (setting.type === 'number') {
        value = Number(raw);
      }
      const result = await updateSetting(setting.key, value);
      setMessage(
        result.restartRequired
          ? t('dashboard.settingsRestartRequired')
          : t('dashboard.settingsSaved'),
      );
      await reload();
    } catch {
      setMessage(t('dashboard.settingsSaveError'));
    } finally {
      setBusyKey(null);
    }
  }

  async function onClear(setting: RuntimeSettingView) {
    setBusyKey(setting.key);
    setMessage(null);
    try {
      const result = await clearSetting(setting.key);
      setMessage(
        result.restartRequired
          ? t('dashboard.settingsRestartRequired')
          : t('dashboard.settingsCleared'),
      );
      await reload();
    } catch {
      setMessage(t('dashboard.settingsSaveError'));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="ml-surface p-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {t('dashboard.settingsTitle')}
      </h1>
      <p className="ml-text-muted mt-2 text-sm">{t('dashboard.settingsIntro')}</p>

      {status === 'loading' ? (
        <p className="ml-text-muted mt-4 text-sm">{t('dashboard.loading')}</p>
      ) : null}
      {status === 'error' ? <p className="mt-4">{t('dashboard.loadError')}</p> : null}

      {data ? (
        <>
          <div className="ml-elevated mt-4 p-3">
            <span className="ml-text-muted text-sm">{t('dashboard.metric.mode')}</span>
            <strong className="mt-1 block text-lg text-foreground">{data.mode}</strong>
          </div>
          {data.restartPending ? (
            <p className="mt-3 text-sm text-warning" role="status">
              {t('dashboard.settingsRestartPending')}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-foreground" role="status">
              {message}
            </p>
          ) : null}
          <div className="mt-4 divide-y divide-border overflow-hidden rounded border border-border">
            {data.settings.map((setting) => (
              <div
                key={setting.key}
                className="grid gap-3 p-4 lg:grid-cols-[1fr_minmax(12rem,18rem)_auto] lg:items-end"
              >
                <div>
                  <strong className="block text-foreground">{setting.key}</strong>
                  <span className="ml-text-muted text-sm">{setting.description}</span>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs ml-text-muted">
                    <span>{t(`dashboard.setting.reload.${setting.reload}`)}</span>
                    <span>
                      {t('dashboard.settingsSource')}: {setting.source}
                    </span>
                    {setting.restartRequired ? (
                      <span className="text-warning">
                        {t('dashboard.settingsNeedsRestart')}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  {!setting.editable ? (
                    <span className="text-sm text-foreground">
                      {setting.secret
                        ? setting.configured
                          ? '********'
                          : t('dashboard.settingsNotSet')
                        : String(setting.value ?? '')}
                    </span>
                  ) : setting.type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={drafts[setting.key] === 'true'}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [setting.key]: event.target.checked ? 'true' : 'false',
                          }))
                        }
                      />
                      {t('dashboard.settingsEnabled')}
                    </label>
                  ) : (
                    <input
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                      type={setting.secret ? 'password' : setting.type === 'number' ? 'number' : 'text'}
                      placeholder={
                        setting.secret
                          ? setting.configured
                            ? t('dashboard.settingsReplaceSecret')
                            : t('dashboard.settingsNotSet')
                          : undefined
                      }
                      value={drafts[setting.key] ?? ''}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [setting.key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
                {setting.editable ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm text-foreground"
                      disabled={busyKey === setting.key}
                      onClick={() => {
                        void onSave(setting);
                      }}
                    >
                      {t('dashboard.settingsSave')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm text-foreground"
                      disabled={busyKey === setting.key || setting.source !== 'stored'}
                      onClick={() => {
                        void onClear(setting);
                      }}
                    >
                      {t('dashboard.settingsClear')}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm ml-text-muted">
                    {t('dashboard.settingsReadOnly')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
