import { describe, expect, it } from 'vitest';
import { createDefaultMetaLayerConfig } from '@metalayer/config';
import { createMemoryConfigurationStore } from '@metalayer/persistence';
import {
  computeAccessExpiresAt,
  persistTrackingOAuthMetadata,
  runProactiveTrackingRefresh,
  shouldProactiveRefresh,
  writeTrackingOAuthMeta,
} from './tracking-token-refresh.js';

const TEST_KEY = Buffer.alloc(32, 41).toString('base64');

describe('tracking-token-refresh', () => {
  it('computes access expiry from expires_in', () => {
    const now = Date.parse('2026-07-12T12:00:00.000Z');
    expect(computeAccessExpiresAt(3600, now)).toBe('2026-07-12T13:00:00.000Z');
  });

  it('decides proactive refresh from expiry buffer', () => {
    const now = Date.parse('2026-07-12T12:00:00.000Z');
    expect(
      shouldProactiveRefresh({
        hasAccess: true,
        hasRefresh: true,
        meta: { accessExpiresAt: '2026-07-12T12:30:00.000Z' },
        now,
        bufferMs: 60 * 60 * 1000,
      }),
    ).toBe(true);
    expect(
      shouldProactiveRefresh({
        hasAccess: true,
        hasRefresh: true,
        meta: { accessExpiresAt: '2026-07-13T12:00:00.000Z' },
        now,
        bufferMs: 60 * 60 * 1000,
      }),
    ).toBe(false);
    expect(
      shouldProactiveRefresh({
        hasAccess: false,
        hasRefresh: true,
        meta: null,
        now,
      }),
    ).toBe(true);
  });

  it('runs proactive refresh for eligible Trakt tokens', async () => {
    const store = createMemoryConfigurationStore(TEST_KEY);
    const created = await store.create({
      config: createDefaultMetaLayerConfig({ name: 'RefreshJob' }),
      editCredential: 'refresh-job-edit',
    });

    await store.upsertVaultSecret(
      created.configId,
      'trakt',
      'oauth_refresh',
      'refresh-token-1',
    );
    await store.upsertVaultSecret(
      created.configId,
      'trakt',
      'oauth_access',
      'expired-access',
    );
    await writeTrackingOAuthMeta(store, created.configId, 'trakt', {
      accessExpiresAt: '2026-07-12T12:00:00.000Z',
    });

    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('trakt.tv/oauth/token')) {
        const body = JSON.parse(String(init?.body)) as { grant_type?: string };
        expect(body.grant_type).toBe('refresh_token');
        return new Response(
          JSON.stringify({
            access_token: 'fresh-access',
            refresh_token: 'refresh-token-2',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    };

    const originalClientId = process.env.TRAKT_CLIENT_ID;
    const originalClientSecret = process.env.TRAKT_CLIENT_SECRET;
    process.env.TRAKT_CLIENT_ID = 'trakt-client';
    process.env.TRAKT_CLIENT_SECRET = 'trakt-secret';

    try {
      const dry = await runProactiveTrackingRefresh({
        store,
        fetchImpl,
        dryRun: true,
        bufferMs: 24 * 60 * 60 * 1000,
      });
      expect(dry).toMatchObject({
        scanned: 1,
        refreshed: 1,
        skipped: 0,
        dryRun: true,
      });

      const applied = await runProactiveTrackingRefresh({
        store,
        fetchImpl,
        bufferMs: 24 * 60 * 60 * 1000,
      });
      expect(applied.refreshed).toBe(1);
      expect(applied.failed).toHaveLength(0);
      expect(await store.getSecretPlaintext(created.configId, 'trakt', 'oauth_access')).toBe(
        'fresh-access',
      );
      const meta = await store.getSecretPlaintext(created.configId, 'trakt', 'session');
      expect(meta).toContain('accessExpiresAt');
    } finally {
      process.env.TRAKT_CLIENT_ID = originalClientId;
      process.env.TRAKT_CLIENT_SECRET = originalClientSecret;
      await store.close();
    }
  });

  it('persists metadata after OAuth exchange helper', async () => {
    const store = createMemoryConfigurationStore(TEST_KEY);
    const created = await store.create({
      config: createDefaultMetaLayerConfig(),
      editCredential: 'meta-edit',
    });
    await persistTrackingOAuthMetadata(store, created.configId, 'trakt', 7200);
    const raw = await store.getSecretPlaintext(created.configId, 'trakt', 'session');
    expect(raw).toContain('accessExpiresAt');
    await store.close();
  });
});
