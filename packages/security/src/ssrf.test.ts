import { describe, expect, it } from 'vitest';
import { assertSafeRemoteUrl, SsrfBlockedError, safeFetch } from './ssrf.js';

describe('assertSafeRemoteUrl', () => {
  it('allows https public hosts', () => {
    const url = assertSafeRemoteUrl('https://cdn.example.com/a.jpg');
    expect(url.hostname).toBe('cdn.example.com');
  });

  it('blocks http by default', () => {
    expect(() => assertSafeRemoteUrl('http://example.com')).toThrow(SsrfBlockedError);
  });

  it('blocks localhost and private IPv4', () => {
    expect(() => assertSafeRemoteUrl('https://localhost/x')).toThrow(SsrfBlockedError);
    expect(() => assertSafeRemoteUrl('https://127.0.0.1/x')).toThrow(SsrfBlockedError);
    expect(() => assertSafeRemoteUrl('https://10.0.0.5/x')).toThrow(SsrfBlockedError);
    expect(() => assertSafeRemoteUrl('https://192.168.1.1/x')).toThrow(SsrfBlockedError);
  });

  it('enforces allowHosts', () => {
    expect(() =>
      assertSafeRemoteUrl('https://evil.example/x', { allowHosts: ['fribb.github.io'] }),
    ).toThrow(SsrfBlockedError);
    expect(
      assertSafeRemoteUrl('https://fribb.github.io/x', { allowHosts: ['fribb.github.io'] }).hostname,
    ).toBe('fribb.github.io');
  });
});

describe('safeFetch', () => {
  it('re-validates redirects and caps size', async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/start')) {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://cdn.example.com/ok.bin' },
        });
      }
      return new Response(Buffer.alloc(16, 1), { status: 200 });
    };
    const response = await safeFetch('https://cdn.example.com/start', {
      fetchImpl,
      allowHosts: ['cdn.example.com'],
      maxBytes: 32,
    });
    expect(response.status).toBe(200);
    expect(calls).toEqual([
      'https://cdn.example.com/start',
      'https://cdn.example.com/ok.bin',
    ]);
  });

  it('rejects redirect to private host', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://127.0.0.1/secret' },
      });
    await expect(
      safeFetch('https://cdn.example.com/start', {
        fetchImpl,
        allowHosts: ['cdn.example.com'],
      }),
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });
});
