export type ArtworkKind = 'poster' | 'background' | 'logo';

export interface ArtworkAsset {
  kind: ArtworkKind;
  url: string;
  language?: string;
  likes?: number;
  provider: string;
}

export interface ArtworkBundle {
  providerId: string;
  identity: string;
  assets: ArtworkAsset[];
}

export type ProviderFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;
