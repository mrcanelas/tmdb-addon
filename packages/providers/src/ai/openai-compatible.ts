import type { ProviderFetch } from '../artwork/types.js';

export type OpenAiCompatibleMediaType = 'movie' | 'series' | 'anime';

/** Shared OpenAI-compatible chat profile (Groq, OpenRouter, …). */
export interface OpenAiCompatibleChatProfile {
  id: string;
  chatCompletionsUrl: string;
  primaryModel: string;
  fallbackModel?: string;
  temperature?: number;
  timeoutMs?: number;
}

export const DEFAULT_TITLE_SEARCH_SYSTEM_PROMPT =
  'You are a movie and TV show expert. Analyze the user query in any language, but ALWAYS return the titles in English.';

/**
 * Prompt used by legacy TMDB Addon Groq/Gemini AI search — comma-separated English titles only.
 */
export function buildTitleSearchPrompt(
  query: string,
  mediaType: OpenAiCompatibleMediaType,
): string {
  return `### TASK
Analyze the user's intent and return a comma-separated list of the most relevant movie or TV show titles.
Order the results by relevance (most relevant first), but do NOT use numbers or categories.

### CONTEXT
Search Query (Native Language): "${query}"
Media Type: ${mediaType}

### STRICT INSTRUCTIONS
1. LANGUAGE: Return titles ONLY in English.
2. FORMAT: Title A, Title B, Title C (Strictly comma-separated).
3. NO NOISE: No introduction, no explanations, no numbering (1, 2, 3), and no bullet points.
4. ORDERING: Place the most semantically correlated titles at the beginning of the list.
5. QUANTITY: Provide a maximum of 20 titles.
6. PURITY: Return only the titles. If you don't find relevant results, return an empty string.

### EXAMPLE
User: "filmes de ficção científica com viagem no tempo"
Response: Interstellar, Tenet, Arrival, Looper, Primer, Twelve Monkeys, Donnie Darko

### YOUR RESPONSE (JSON-like list only):`;
}

/** Parse comma-separated title lists from AI responses (legacy Groq behavior). */
export function parseCommaSeparatedTitles(content: string | undefined | null): string[] {
  if (!content) return [];

  return content
    .split(',')
    .map((title) => title.trim().replace(/^\d+[\.\-\)]\s*/, ''))
    .filter(
      (title) =>
        title.length > 0 &&
        !title.toLowerCase().includes('here are') &&
        !title.toLowerCase().includes('titles:') &&
        !title.toLowerCase().includes('response:'),
    );
}

export async function fetchOpenAiCompatibleChatCompletion(options: {
  profile: OpenAiCompatibleChatProfile;
  apiKey: string;
  prompt: string;
  systemPrompt?: string;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.profile.chatCompletionsUrl, {
    method: 'POST',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.profile.primaryModel,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt ?? DEFAULT_TITLE_SEARCH_SYSTEM_PROMPT,
        },
        { role: 'user', content: options.prompt },
      ],
      temperature: options.profile.temperature ?? 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `${options.profile.id} chat completion failed (${response.status})`,
    );
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: unknown;
  };
  if (body.error) {
    throw new Error(`${options.profile.id} chat completion returned an error`);
  }

  return body.choices?.[0]?.message?.content ?? '';
}

/**
 * Search for relevant titles using an OpenAI-compatible chat API.
 * Tries the primary model, then an optional fallback model.
 */
export async function searchTitlesWithOpenAiCompatible(options: {
  profile: OpenAiCompatibleChatProfile;
  apiKey: string;
  query: string;
  mediaType: OpenAiCompatibleMediaType;
  fetchImpl?: ProviderFetch;
  signal?: AbortSignal;
  systemPrompt?: string;
}): Promise<string[]> {
  const prompt = buildTitleSearchPrompt(options.query, options.mediaType);

  try {
    const content = await fetchOpenAiCompatibleChatCompletion({
      profile: options.profile,
      apiKey: options.apiKey,
      prompt,
      systemPrompt: options.systemPrompt,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
    });
    return parseCommaSeparatedTitles(content);
  } catch (primaryError) {
    if (!options.profile.fallbackModel) {
      throw primaryError;
    }

    const content = await fetchOpenAiCompatibleChatCompletion({
      profile: {
        ...options.profile,
        primaryModel: options.profile.fallbackModel,
      },
      apiKey: options.apiKey,
      prompt,
      systemPrompt: options.systemPrompt,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
    });
    return parseCommaSeparatedTitles(content);
  }
}
