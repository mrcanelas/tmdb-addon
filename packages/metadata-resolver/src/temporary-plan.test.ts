import { describe, expect, it } from 'vitest';
import {
  FieldResolutionPlanSchema,
  planFromProviderChain,
  type ResolutionConfig,
} from '@metalayer/config';
import { compileResolutionPlan } from './compile.js';
import { resolveFieldFromPlan } from './resolve-plan.js';

describe('temporary resolution plan override', () => {
  it('compiles and resolves an unsaved plan without using stored field defaults', () => {
    const stored: ResolutionConfig = {
      version: 1,
      defaults: {
        fields: {
          title: planFromProviderChain(
            ['imdb'],
            [{ type: 'locale', value: 'en-US' }],
            'provider-first',
          ),
        },
      },
      mediaTypes: {},
    };

    const draft = FieldResolutionPlanSchema.parse(
      planFromProviderChain(
        ['tmdb', 'tvdb'],
        [
          { type: 'locale', value: 'pt-BR' },
          { type: 'locale', value: 'en-US' },
        ],
        'locale-first',
      ),
    );

    const resolution: ResolutionConfig = {
      ...stored,
      defaults: {
        ...stored.defaults,
        fields: {
          ...stored.defaults.fields,
          title: draft,
        },
      },
    };

    const effective = compileResolutionPlan({
      field: 'title',
      resolution,
      metadataLocale: 'pt-BR',
    });

    expect(effective.generatedSteps[0]?.provider).toBe('tmdb');
    expect(
      (effective.generatedSteps[0]?.locale as { value?: string } | undefined)
        ?.value,
    ).toBe('pt-BR');

    const result = resolveFieldFromPlan(
      [
        { provider: 'tmdb', value: 'Breaking Bad', locale: 'pt-BR' },
        { provider: 'imdb', value: 'Should not win', locale: 'en-US' },
      ],
      effective,
    );

    expect(result.value).toBe('Breaking Bad');
    expect(result.selectedProvider).toBe('tmdb');
    expect(stored.defaults.fields.title?.providers).toEqual(['imdb']);
  });
});
