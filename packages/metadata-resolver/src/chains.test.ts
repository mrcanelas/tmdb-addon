import { describe, expect, it } from 'vitest';
import {
  expandPlanSteps,
  compileResolutionPlan,
} from './compile.js';
import { resolveFieldFromPlan } from './resolve-plan.js';
import { planFromProviderChain } from '@metalayer/config';

describe('Field Resolution Chains compiler', () => {
  it('expands locale-first before provider-first', () => {
    const localeFirst = expandPlanSteps(
      planFromProviderChain(
        ['tmdb', 'tvdb'],
        [
          { type: 'locale', value: 'pt-BR' },
          { type: 'locale', value: 'en-US' },
        ],
        'locale-first',
      ),
    );
    expect(localeFirst.map((step) => `${step.provider}:${(step.locale as { value?: string }).value}`)).toEqual([
      'tmdb:pt-BR',
      'tvdb:pt-BR',
      'tmdb:en-US',
      'tvdb:en-US',
    ]);

    const providerFirst = expandPlanSteps(
      planFromProviderChain(
        ['tmdb', 'tvdb'],
        [
          { type: 'locale', value: 'pt-BR' },
          { type: 'locale', value: 'en-US' },
        ],
        'provider-first',
      ),
    );
    expect(providerFirst.map((step) => `${step.provider}:${(step.locale as { value?: string }).value}`)).toEqual([
      'tmdb:pt-BR',
      'tmdb:en-US',
      'tvdb:pt-BR',
      'tvdb:en-US',
    ]);
  });

  it('expands explicit steps as-is', () => {
    const steps = expandPlanSteps({
      version: 1,
      strategy: 'explicit',
      skipEmpty: true,
      skipInvalid: true,
      stopAfterFirstValid: true,
      steps: [
        {
          id: 'a',
          provider: 'tmdb',
          locale: { type: 'locale', value: 'pt-BR' },
          enabled: true,
        },
        {
          id: 'b',
          provider: 'tvdb',
          locale: { type: 'locale', value: 'en-US' },
          enabled: true,
        },
      ],
    });
    expect(steps).toHaveLength(2);
    expect(steps[0]?.id).toBe('a');
  });

  it('compiles from fieldProviders when resolution missing', () => {
    const plan = compileResolutionPlan({
      field: 'title',
      fieldProviders: { title: ['tmdb', 'tvdb'] },
      metadataLocale: 'pt-BR',
      fallbackLocales: ['en-US'],
    });
    expect(plan.source).toBe('field-providers');
    expect(plan.strategy).toBe('locale-first');
    expect(plan.generatedSteps.length).toBeGreaterThan(2);
    expect(plan.effectivePlanHash).toMatch(/^[0-9a-f]+$/);
  });
});

describe('resolveFieldFromPlan', () => {
  it('records empty attempts then selects fallback locale', () => {
    const plan = compileResolutionPlan({
      field: 'title',
      resolution: {
        version: 1,
        defaults: {
          fields: {
            title: planFromProviderChain(
              ['tmdb'],
              [
                { type: 'locale', value: 'pt-BR' },
                { type: 'locale', value: 'en-US' },
              ],
              'locale-first',
            ),
          },
        },
        mediaTypes: {},
      },
      metadataLocale: 'pt-BR',
    });

    const result = resolveFieldFromPlan(
      [
        { provider: 'tmdb', value: '', locale: 'pt-BR' },
        { provider: 'tmdb', value: 'Hello', locale: 'en-US' },
      ],
      plan,
    );

    expect(result.value).toBe('Hello');
    expect(result.selectedLocale).toBe('en-US');
    expect(result.fallbackUsed).toBe(true);
    expect(result.attempts?.[0]?.status).toBe('empty');
    expect(result.attempts?.[1]?.status).toBe('selected');
    expect(result.effectivePlanHash).toBe(plan.effectivePlanHash);
  });
});
