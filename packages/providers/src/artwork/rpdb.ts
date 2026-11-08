import {
  RatedPosterArtworkAdapter,
  type RatedPosterAdapterOptions,
} from './rated-poster-adapter.js';
import { RATED_POSTER_PROFILES } from './rated-poster.js';

export type { RatedPosterAdapterOptions as RpdbAdapterOptions } from './rated-poster-adapter.js';
export type { RatedPosterMediaType as RpdbMediaType } from './rated-poster.js';

/**
 * RatingPosterDB artwork adapter (thin profile over the shared rated-poster runtime).
 */
export class RpdbArtworkAdapter extends RatedPosterArtworkAdapter {
  constructor(options: RatedPosterAdapterOptions = {}) {
    super(RATED_POSTER_PROFILES.rpdb, options);
  }
}

export class AioRatingsArtworkAdapter extends RatedPosterArtworkAdapter {
  constructor(options: RatedPosterAdapterOptions = {}) {
    super(RATED_POSTER_PROFILES.aioratings, options);
  }
}

export class OpenPosterDbArtworkAdapter extends RatedPosterArtworkAdapter {
  constructor(options: RatedPosterAdapterOptions = {}) {
    super(RATED_POSTER_PROFILES.openposterdb, options);
  }
}

export class TopPostersArtworkAdapter extends RatedPosterArtworkAdapter {
  constructor(options: RatedPosterAdapterOptions = {}) {
    super(RATED_POSTER_PROFILES.topposters, options);
  }
}
