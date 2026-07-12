import { describe, expect, it } from 'vitest';
import {
  ACTIVE_MODE,
  getActiveManifestIdentity,
  LEGACY,
  METALAYER,
} from './index.js';

describe('@metalayer/identity', () => {
  it('keeps legacy manifest id independent from MetaLayer package naming', () => {
    expect(LEGACY.manifestId).toBe('tmdb-addon');
    expect(LEGACY.manifestName).toBe('The Movie Database Addon');
    expect(METALAYER.manifestId).not.toBe(LEGACY.manifestId);
    expect(METALAYER.version).toMatch(/^1\.0\.0-(alpha|beta|rc)\./);
  });

  it('defaults to legacy compatibility identity', () => {
    expect(ACTIVE_MODE).toBe('legacy');
    expect(getActiveManifestIdentity()).toEqual({
      id: LEGACY.manifestId,
      name: LEGACY.manifestName,
      version: LEGACY.manifestVersion,
    });
  });
});
