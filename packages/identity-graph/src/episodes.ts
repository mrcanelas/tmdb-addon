import type {
  ExternalIdentity,
  IdentityEdge,
  IdentityEvidence,
  IdentityMatchMethod,
  IdentityProvider,
} from './types.js';

/** Anime entry (AniList / MAL / Kitsu) mapped onto a season of a TMDB/IMDb series. */
export interface CourMappingInput {
  /** Anime-native entry, e.g. `{ provider: 'anilist', id: '5114' }`. */
  entry: { provider: IdentityProvider; id: string };
  /** Series-level identity on the target provider. */
  series: { provider: IdentityProvider; id: string };
  /** Season the entry occupies on the target provider (1-based). */
  seasonNumber: number;
  /** Absolute episode offset when the entry continues previous numbering. */
  absoluteOffset?: number;
  method?: IdentityMatchMethod;
  confidence?: number;
  verified?: boolean;
  source?: string;
  now?: Date;
}

function stamp(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

function edge(
  source: ExternalIdentity,
  target: ExternalIdentity,
  options: {
    confidence: number;
    method: IdentityMatchMethod;
    verified: boolean;
    evidence: IdentityEvidence[];
    now?: Date;
  },
): IdentityEdge {
  const at = stamp(options.now);
  return {
    source,
    target,
    confidence: options.confidence,
    method: options.method,
    verified: options.verified,
    evidence: options.evidence,
    createdAt: at,
    updatedAt: at,
  };
}

/** Stable id for a season/cour node: `{seriesId}/s{season}`. */
export function courNodeId(seriesId: string, seasonNumber: number): string {
  return `${seriesId}/s${seasonNumber}`;
}

/** Stable id for an episode node: `{seriesId}/s{season}e{episode}`. */
export function episodeNodeId(seriesId: string, seasonNumber: number, episode: number): string {
  return `${seriesId}/s${seasonNumber}e${episode}`;
}

/**
 * Bidirectional `cour` edges: anime entry ↔ series season (AGENTS.md §18.2).
 * The evidence records the season offset so Meta Inspector can explain it.
 */
export function buildCourEdges(input: CourMappingInput): IdentityEdge[] {
  const entry: ExternalIdentity = {
    provider: input.entry.provider,
    id: input.entry.id,
    entityKind: 'cour',
  };
  const season: ExternalIdentity = {
    provider: input.series.provider,
    id: courNodeId(input.series.id, input.seasonNumber),
    entityKind: 'season',
  };
  const evidence: IdentityEvidence[] = [
    {
      kind: 'dataset-row',
      summary: `${entry.provider}:${entry.id} → ${input.series.provider}:${input.series.id} season ${input.seasonNumber}${
        input.absoluteOffset ? ` (absolute offset ${input.absoluteOffset})` : ''
      }`,
      source: input.source ?? 'fribb',
      observedAt: stamp(input.now),
    },
  ];
  const options = {
    confidence: input.confidence ?? 0.8,
    method: input.method ?? 'dataset',
    verified: input.verified ?? false,
    evidence,
    now: input.now,
  };
  return [edge(entry, season, options), edge(season, entry, options)];
}

/**
 * `episode` edges for a cour mapping: entry episode N ↔ series season S episode N(+offset).
 * Generated lazily for the episodes actually served, never for whole franchises.
 */
export function buildEpisodeEdges(
  input: CourMappingInput & { episodes: number[] },
): IdentityEdge[] {
  const edges: IdentityEdge[] = [];
  for (const number of input.episodes) {
    if (!Number.isFinite(number) || number < 1) continue;
    const entryEpisode: ExternalIdentity = {
      provider: input.entry.provider,
      id: `${input.entry.id}/e${number}`,
      entityKind: 'episode',
    };
    const seriesEpisode: ExternalIdentity = {
      provider: input.series.provider,
      id: episodeNodeId(input.series.id, input.seasonNumber, number),
      entityKind: 'episode',
    };
    const evidence: IdentityEvidence[] = [
      {
        kind: 'dataset-row',
        summary: `${entryEpisode.provider}:${entryEpisode.id} ↔ ${seriesEpisode.provider}:${seriesEpisode.id}`,
        source: input.source ?? 'fribb',
        observedAt: stamp(input.now),
      },
    ];
    const options = {
      confidence: input.confidence ?? 0.8,
      method: input.method ?? 'dataset',
      verified: input.verified ?? false,
      evidence,
      now: input.now,
    };
    edges.push(edge(entryEpisode, seriesEpisode, options), edge(seriesEpisode, entryEpisode, options));
  }
  return edges;
}
