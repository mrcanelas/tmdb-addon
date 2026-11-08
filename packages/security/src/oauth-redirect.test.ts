import { describe, expect, it } from 'vitest';
import { isAllowedOAuthRedirectUri } from './oauth-redirect.js';

describe('@metalayer/security oauth redirect allowlist', () => {
  it('allows exact env and public-base matches', () => {
    expect(
      isAllowedOAuthRedirectUri(
        'https://addon.example/configure/oauth/trakt/callback',
        {
          provider: 'trakt',
          envRedirectUri: 'https://addon.example/configure/oauth/trakt/callback',
        },
      ),
    ).toBe(true);

    expect(
      isAllowedOAuthRedirectUri(
        'https://hosted.example/configure/oauth/simkl/callback',
        {
          provider: 'simkl',
          publicBaseUrl: 'https://hosted.example',
        },
      ),
    ).toBe(true);
  });

  it('allows loopback configure callbacks and rejects arbitrary hosts', () => {
    expect(
      isAllowedOAuthRedirectUri(
        'http://localhost:1338/configure/oauth/anilist/callback',
        { provider: 'anilist' },
      ),
    ).toBe(true);

    expect(
      isAllowedOAuthRedirectUri(
        'https://evil.example/configure/oauth/trakt/callback',
        { provider: 'trakt' },
      ),
    ).toBe(false);

    expect(
      isAllowedOAuthRedirectUri('javascript:alert(1)', {
        provider: 'mal',
      }),
    ).toBe(false);
  });

  it('honors METALAYER_OAUTH_REDIRECT_URIS extras', () => {
    expect(
      isAllowedOAuthRedirectUri(
        'https://tunnel.example/configure/oauth/mal/callback',
        {
          provider: 'mal',
          extraAllowlist:
            'https://tunnel.example/configure/oauth/mal/callback, https://other.example/cb',
        },
      ),
    ).toBe(true);
  });
});
