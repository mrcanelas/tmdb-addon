export interface ManifestIdentity {
  id: string;
  name: string;
  version: string;
}

export interface LegacyIdentity {
  readonly manifestId: 'tmdb-addon';
  readonly manifestName: 'The Movie Database Addon';
  readonly manifestVersion: string;
}

export interface MetaLayerIdentity {
  readonly manifestId: string;
  readonly manifestName: 'MetaLayer';
  readonly version: string;
  readonly tagline: string;
}

export declare const LEGACY: LegacyIdentity;
export declare const METALAYER: MetaLayerIdentity;
export declare const ACTIVE_MODE: 'legacy' | 'metalayer';
export declare function getActiveManifestIdentity(): ManifestIdentity;
