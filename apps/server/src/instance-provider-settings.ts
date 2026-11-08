import { getProvider, listProviders } from '@metalayer/providers';
import type { InstanceProviderStoredState } from '@metalayer/persistence';

export type InstanceProviderState = {
  id: string;
  enabled: boolean;
  configured: boolean;
  source: 'env' | 'admin' | 'default';
};

const PROVIDER_ENV: Record<string, string[]> = {
  tmdb: ['METALAYER_TMDB_API_KEY', 'TMDB_API'],
  fanart: ['FANART_API_KEY'],
  rpdb: ['RPDB_API_KEY'],
  topposters: ['TOP_POSTERS_API_KEY'],
  aioratings: ['AIORATINGS_API_KEY'],
  openposterdb: ['OPENPOSTERDB_API_KEY'],
  mdblist: ['MDBLIST_API_KEY'],
  publicmetadb: ['PUBLICMETADB_API_KEY'],
  gemini: ['GEMINI_API_KEY'],
  groq: ['GROQ_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  trakt: ['TRAKT_CLIENT_ID', 'TRAKT_CLIENT_SECRET'],
  simkl: ['SIMKL_CLIENT_ID', 'SIMKL_CLIENT_SECRET'],
  anilist: ['ANILIST_CLIENT_ID', 'ANILIST_CLIENT_SECRET'],
  mal: ['MAL_CLIENT_ID', 'MAL_CLIENT_SECRET'],
};

export class InstanceProviderSettings {
  private readonly overrides = new Map<string, InstanceProviderStoredState>();

  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    initial: Record<string, InstanceProviderStoredState> = {},
  ) {
    for (const [id, state] of Object.entries(initial)) {
      this.overrides.set(id, state);
    }
  }

  list(): InstanceProviderState[] {
    return listProviders().map((provider) => this.get(provider.id));
  }

  get(id: string): InstanceProviderState {
    const provider = getProvider(id);
    const envKeys = PROVIDER_ENV[id] ?? [];
    const envConfigured = envKeys.length > 0 && envKeys.every((key) => this.env[key]?.trim());
    const needsOperatorConfig = Boolean(provider?.requiresCredential || provider?.requiresOAuth);
    const override = this.overrides.get(id);
    const base: InstanceProviderState = {
      id,
      enabled: provider?.connectionState !== 'coming_soon',
      configured: !needsOperatorConfig || Boolean(envConfigured),
      source: override ? 'admin' : envConfigured ? 'env' : 'default',
    };
    return { ...base, ...override, id };
  }

  update(id: string, patch: InstanceProviderStoredState): InstanceProviderState {
    const next = { ...this.overrides.get(id) };
    if (patch.enabled !== undefined) next.enabled = patch.enabled;
    if (patch.configured !== undefined) next.configured = patch.configured;
    this.overrides.set(id, next);
    return this.get(id);
  }
}
