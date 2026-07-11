/**
 * Manifest and product identity.
 *
 * These values must NOT be derived from package.json name/version.
 * See docs/adr/0001-manifest-identity.md and AGENTS.md §5.6 / §6.2.
 */

'use strict';

/** @type {const} */
const LEGACY = {
  manifestId: 'tmdb-addon',
  manifestName: 'The Movie Database Addon',
  /** Published legacy addon version line (compatibility mode). */
  manifestVersion: '3.1.7',
};

/** @type {const} */
const METALAYER = {
  /** Draft native ID — finalize before beta (ADR-0001). */
  manifestId: 'community.metalayer',
  manifestName: 'MetaLayer',
  /** MetaLayer SemVer line — independent from the legacy 3.x package. */
  version: '1.0.0-alpha.1',
  tagline: 'Your metadata. Your catalogs. Your way.',
};

/** Default identity while the runtime remains in legacy compatibility mode. */
const ACTIVE_MODE = 'legacy';

function getActiveManifestIdentity() {
  if (ACTIVE_MODE === 'metalayer') {
    return {
      id: METALAYER.manifestId,
      name: METALAYER.manifestName,
      version: METALAYER.version,
    };
  }
  return {
    id: LEGACY.manifestId,
    name: LEGACY.manifestName,
    version: LEGACY.manifestVersion,
  };
}

module.exports = {
  LEGACY,
  METALAYER,
  ACTIVE_MODE,
  getActiveManifestIdentity,
};
