import { AiProviderAdapter, type AiAdapterOptions } from './ai-adapter.js';

export type GroqAdapterOptions = AiAdapterOptions;

/** Groq AI search adapter (OpenAI-compatible chat completions). */
export class GroqAiAdapter extends AiProviderAdapter {
  constructor(options: GroqAdapterOptions = {}) {
    super('groq', options);
  }
}
