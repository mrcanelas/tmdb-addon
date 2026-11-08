import { AiProviderAdapter, type AiAdapterOptions } from './ai-adapter.js';

export type OpenRouterAdapterOptions = AiAdapterOptions;

/** OpenRouter AI search adapter (OpenAI-compatible chat completions). */
export class OpenRouterAiAdapter extends AiProviderAdapter {
  constructor(options: OpenRouterAdapterOptions = {}) {
    super('openrouter', options);
  }
}
