import { AiProviderAdapter, type AiAdapterOptions } from './ai-adapter.js';

export type GeminiAdapterOptions = AiAdapterOptions;

/** Google Gemini adapter (ping via Generative Language API). */
export class GeminiAiAdapter extends AiProviderAdapter {
  constructor(options: GeminiAdapterOptions = {}) {
    super('gemini', options);
  }
}
