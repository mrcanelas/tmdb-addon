import { describe, expect, it } from 'vitest';
import {
  FanartArtworkAdapter,
  ImdbRatingsStubAdapter,
  RpdbArtworkAdapter,
} from './index.js';

describe('@metalayer/providers artwork and ratings stubs', () => {
  it('exposes stubs behind the shared ProviderAdapter contract', async () => {
    const fanart = new FanartArtworkAdapter();
    await expect(fanart.ping({ correlationId: 'a' })).rejects.toMatchObject({
      code: 'auth',
    });
    await expect(
      fanart.ping({ correlationId: 'a', apiKey: 'fanart-key' }),
    ).resolves.toMatchObject({ state: 'healthy' });

    expect(new RpdbArtworkAdapter().locale.supportsLocale('en-US')).toBe(false);
    await expect(
      new ImdbRatingsStubAdapter().ping({ correlationId: 'r' }),
    ).rejects.toMatchObject({ code: 'unsupported' });
  });
});
