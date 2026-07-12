import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import {
  RuleSetSchema,
  SortingPlanSchema,
  type RuleSet,
  type SortingPlan,
} from '@metalayer/config';
import {
  checkProviderRuleSupport,
  evaluateRules,
  resolveEffectiveRules,
  type RuleCandidate,
} from '@metalayer/rules';
import { applySortingPlan, resolveSeedWindow, type SortableItem } from '@metalayer/sorting';
import { getProvider } from '@metalayer/providers';
import type { ConfigurationStore } from '@metalayer/persistence';

declare module 'fastify' {
  interface FastifyInstance {
    configStore: ConfigurationStore;
  }
}

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

function requireEdit(
  app: { configStore: ConfigurationStore },
  request: FastifyRequest,
  configId: string,
) {
  const credential = readEditCredential(request);
  if (!credential || !app.configStore.verifyEditAccess(configId, credential)) {
    const exists = app.configStore.getPublic(configId);
    if (!exists) {
      return {
        ok: false as const,
        status: 404,
        body: createApiError({
          code: 'CONFIGURATION_NOT_FOUND',
          message: `Configuration ${configId} was not found`,
          correlationId: request.correlationId,
          params: { configId },
        }),
      };
    }
    return {
      ok: false as const,
      status: 401,
      body: createApiError({
        code: 'EDIT_CREDENTIAL_INVALID',
        message: 'Edit credential is invalid',
        correlationId: request.correlationId,
      }),
    };
  }
  return { ok: true as const };
}

export const rulesSortingRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Params: { configId: string };
    Querystring: { provider?: string; catalogInstanceId?: string };
  }>('/configurations/:configId/rules/effective', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = app.configStore.getPublic(request.params.configId)!;
    const catalog = request.query.catalogInstanceId
      ? view.config.catalogs.find((item) => item.instanceId === request.query.catalogInstanceId)
      : undefined;
    const effective = resolveEffectiveRules({
      global: view.config.globalRules,
      catalog: catalog?.rules,
    });
    const providerId = request.query.provider || catalog?.provider || 'tmdb';
    const provider = getProvider(providerId);
    const warnings = provider
      ? checkProviderRuleSupport(effective, providerId, provider.capabilities)
      : [];

    return {
      configId: view.configId,
      effective,
      warnings,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      items?: RuleCandidate[];
      catalogInstanceId?: string;
      rules?: RuleSet;
      provider?: string;
    };
  }>('/configurations/:configId/rules/preview', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = app.configStore.getPublic(request.params.configId)!;
    const catalog = request.body?.catalogInstanceId
      ? view.config.catalogs.find((item) => item.instanceId === request.body?.catalogInstanceId)
      : undefined;

    let override: RuleSet | undefined;
    if (request.body?.rules) {
      try {
        override = RuleSetSchema.parse(request.body.rules);
      } catch {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Invalid rules payload',
            correlationId: request.correlationId,
            params: { field: 'rules' },
          }),
        );
      }
    }

    const effective = resolveEffectiveRules({
      global: view.config.globalRules,
      catalog: override ?? catalog?.rules,
    });

    const items = request.body?.items ?? [];
    const evaluations = items.map((item) => ({
      id: item.id,
      ...evaluateRules(item, effective),
    }));

    const providerId = request.body?.provider || catalog?.provider || 'tmdb';
    const provider = getProvider(providerId);
    const warnings = provider
      ? checkProviderRuleSupport(effective, providerId, provider.capabilities)
      : [];

    return {
      configId: view.configId,
      effective,
      evaluations,
      warnings,
      included: evaluations.filter((item) => item.include).map((item) => item.id),
      excluded: evaluations.filter((item) => !item.include).map((item) => item.id),
      correlationId: request.correlationId,
    };
  });

  app.put<{
    Params: { configId: string };
    Body: { globalRules?: RuleSet; note?: string };
  }>('/configurations/:configId/rules', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = app.configStore.getPublic(request.params.configId)!;
    let globalRules = view.config.globalRules;
    if (request.body?.globalRules) {
      try {
        globalRules = RuleSetSchema.parse(request.body.globalRules);
      } catch {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Invalid globalRules payload',
            correlationId: request.correlationId,
            params: { field: 'globalRules' },
          }),
        );
      }
    }

    const updated = app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        globalRules,
        updatedAt: new Date().toISOString(),
      },
      note: request.body?.note ?? 'rules:update-global',
    });

    return {
      configId: updated!.configId,
      globalRules: updated!.config.globalRules,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      items?: SortableItem[];
      plan?: SortingPlan;
      catalogInstanceId?: string;
      seedKey?: string;
    };
  }>('/configurations/:configId/sorting/preview', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = app.configStore.getPublic(request.params.configId)!;
    const catalog = request.body?.catalogInstanceId
      ? view.config.catalogs.find((item) => item.instanceId === request.body?.catalogInstanceId)
      : undefined;

    let plan: SortingPlan =
      catalog?.sorting ??
      view.config.globalSorting ?? {
        criteria: [{ field: 'sourceOrder', direction: 'asc' }],
        stable: true,
      };

    if (request.body?.plan) {
      try {
        plan = SortingPlanSchema.parse(request.body.plan);
      } catch {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Invalid sorting plan payload',
            correlationId: request.correlationId,
            params: { field: 'plan' },
          }),
        );
      }
    }

    const items = (request.body?.items ?? []).map((item, index) => ({
      ...item,
      sourceOrder: item.sourceOrder ?? index,
    }));
    const seedKey = request.body?.seedKey ?? request.body?.catalogInstanceId ?? view.configId;
    const sorted = applySortingPlan(items, plan, { seedKey });

    return {
      configId: view.configId,
      plan,
      seedWindow: resolveSeedWindow(plan, new Date(), seedKey),
      order: sorted.map((item) => item.id),
      items: sorted,
      correlationId: request.correlationId,
    };
  });

  app.put<{
    Params: { configId: string };
    Body: { globalSorting?: SortingPlan | null; note?: string };
  }>('/configurations/:configId/sorting', async (request, reply) => {
    const access = requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const view = app.configStore.getPublic(request.params.configId)!;
    let globalSorting = view.config.globalSorting;
    if (request.body?.globalSorting === null) {
      globalSorting = undefined;
    } else if (request.body?.globalSorting) {
      try {
        globalSorting = SortingPlanSchema.parse(request.body.globalSorting);
      } catch {
        return reply.status(400).send(
          createApiError({
            code: 'VALIDATION_FAILED',
            message: 'Invalid globalSorting payload',
            correlationId: request.correlationId,
            params: { field: 'globalSorting' },
          }),
        );
      }
    }

    const nextConfig = {
      ...view.config,
      updatedAt: new Date().toISOString(),
    } as typeof view.config;
    if (globalSorting) nextConfig.globalSorting = globalSorting;
    else delete nextConfig.globalSorting;

    const updated = app.configStore.update(request.params.configId, {
      config: nextConfig,
      note: request.body?.note ?? 'sorting:update-global',
    });

    return {
      configId: updated!.configId,
      globalSorting: updated!.config.globalSorting ?? null,
      correlationId: request.correlationId,
    };
  });
};
