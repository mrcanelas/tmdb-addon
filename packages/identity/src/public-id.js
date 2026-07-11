'use strict';

/**
 * Public Stremio id helpers (ADR 0006).
 * Canonical MetaLayer work ids are separate from these public ids.
 */

/**
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function normalizeImdbId(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (/^tt\d+$/.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `tt${trimmed}`;
  return null;
}

/**
 * @param {string | number | null | undefined} value
 * @returns {string | null}
 */
function normalizeTmdbPublicId(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (/^tmdb:\d+$/i.test(raw)) return `tmdb:${raw.split(':')[1]}`;
  if (/^\d+$/.test(raw)) return `tmdb:${raw}`;
  return null;
}

/**
 * @typedef {'imdb' | 'tmdb' | 'unknown'} PublicIdKind
 * @typedef {{ kind: PublicIdKind, imdbId?: string, tmdbId?: string, raw: string }} ParsedPublicId
 */

/**
 * @param {string} value
 * @returns {ParsedPublicId}
 */
function parsePublicId(value) {
  const raw = String(value ?? '').trim();
  const imdbId = normalizeImdbId(raw);
  if (imdbId && (/^tt/i.test(raw) || raw === imdbId)) {
    return { kind: 'imdb', imdbId, raw };
  }
  const tmdbPublic = normalizeTmdbPublicId(raw);
  if (tmdbPublic) {
    return { kind: 'tmdb', tmdbId: tmdbPublic.slice('tmdb:'.length), raw };
  }
  // Bare numeric without prefix is treated as TMDB for lookup convenience,
  // but public emission still prefers IMDb when available.
  if (/^\d+$/.test(raw)) {
    return { kind: 'tmdb', tmdbId: raw, raw };
  }
  return { kind: 'unknown', raw };
}

/**
 * @param {{
 *   imdbId?: string | null,
 *   tmdbId?: string | number | null,
 *   preference?: 'imdb' | 'tmdb',
 * }} input
 * @returns {string | null}
 */
function selectStremioPublicId(input) {
  const preference = input.preference ?? 'imdb';
  const imdbId = normalizeImdbId(input.imdbId ?? undefined);
  const tmdbPublic = normalizeTmdbPublicId(input.tmdbId ?? undefined);

  if (preference === 'imdb') {
    if (imdbId) return imdbId;
    return tmdbPublic;
  }

  if (tmdbPublic) return tmdbPublic;
  return imdbId;
}

/**
 * @param {'imdb' | 'tmdb'} preference
 * @returns {string[]}
 */
function stremioIdPrefixes(preference = 'imdb') {
  return preference === 'tmdb' ? ['tmdb:', 'tt'] : ['tt', 'tmdb:'];
}

module.exports = {
  normalizeImdbId,
  normalizeTmdbPublicId,
  parsePublicId,
  selectStremioPublicId,
  stremioIdPrefixes,
};
