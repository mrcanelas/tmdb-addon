import { describe, expect, it, vi } from 'vitest';
import { GroqAiAdapter } from './groq.js';
import { OpenRouterAiAdapter } from './openrouter.js';
import {
  AI_SERVICE_PROFILES,
  OPENAI_COMPATIBLE_CHAT_PROFILES,
} from './ai-profiles.js';
import {
  buildTitleSearchPrompt,
  parseCommaSeparatedTitles,
  searchTitlesWithOpenAiCompatible,
} from './openai-compatible.js';

describe('AI service profiles', () => {
  it('uses auth/key for OpenRouter ping (not public /models)', () => {
    const profile = AI_SERVICE_PROFILES.openrouter;
    expect(profile.pingUrl()).toBe('https://openrouter.ai/api/v1/auth/key');
    expect(profile.pingHeaders('sk-test')).toEqual({
      Authorization: 'Bearer sk-test',
      'Content-Type': 'application/json',
    });
    expect(profile.validatePingBody?.({ data: { label: 'test' } })).toBe(true);
    expect(profile.validatePingBody?.({ error: { message: 'bad' } })).toBe(false);
  });

  it('uses Groq OpenAI-compatible models endpoint for ping', () => {
    const profile = AI_SERVICE_PROFILES.groq;
    expect(profile.pingUrl()).toBe('https://api.groq.com/openai/v1/models');
    expect(profile.pingHeaders('gsk-test').Authorization).toBe('Bearer gsk-test');
    expect(profile.validatePingBody?.({ data: [{ id: 'llama' }] })).toBe(true);
  });

  it('declares chat profiles for Groq and OpenRouter', () => {
    expect(OPENAI_COMPATIBLE_CHAT_PROFILES.groq.primaryModel).toBe(
      'llama-3.3-70b-versatile',
    );
    expect(OPENAI_COMPATIBLE_CHAT_PROFILES.openrouter.chatCompletionsUrl).toBe(
      'https://openrouter.ai/api/v1/chat/completions',
    );
  });
});

describe('OpenAI-compatible title search', () => {
  it('builds legacy-style English title prompt', () => {
    const prompt = buildTitleSearchPrompt('filmes de viagem no tempo', 'movie');
    expect(prompt).toContain('filmes de viagem no tempo');
    expect(prompt).toContain('Media Type: movie');
    expect(prompt).toContain('Return titles ONLY in English');
  });

  it('parses comma-separated titles and strips numbering noise', () => {
    expect(
      parseCommaSeparatedTitles('Interstellar, Tenet, 1. Arrival, 2) Looper'),
    ).toEqual(['Interstellar', 'Tenet', 'Arrival', 'Looper']);
    expect(parseCommaSeparatedTitles('')).toEqual([]);
    expect(parseCommaSeparatedTitles('Here are titles: Interstellar')).toEqual([]);
  });

  it('falls back to secondary model when primary chat completion fails', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      if (body.model === 'llama-3.3-70b-versatile') {
        return new Response('error', { status: 500 });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Interstellar, Tenet' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const titles = await searchTitlesWithOpenAiCompatible({
      profile: OPENAI_COMPATIBLE_CHAT_PROFILES.groq,
      apiKey: 'gsk-test',
      query: 'sci-fi time travel',
      mediaType: 'movie',
      fetchImpl,
    });

    expect(titles).toEqual(['Interstellar', 'Tenet']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('AI adapters', () => {
  it('exposes Groq and OpenRouter adapter ids', () => {
    expect(new GroqAiAdapter().id).toBe('groq');
    expect(new OpenRouterAiAdapter().id).toBe('openrouter');
  });
});
