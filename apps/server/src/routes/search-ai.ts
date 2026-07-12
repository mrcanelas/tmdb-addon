import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createApiError } from '@metalayer/api-errors';
import type { ConfigurationStore } from '@metalayer/persistence';
import {
  FixtureAiProvider,
  ProposalConfirmationRequiredError,
  applyConfirmedProposal,
  assertProposalConfirmation,
  combineSearchHits,
  createRankedListCatalogProposal,
  fixtureRankedCandidates,
  fixtureSearchHits,
  resolveRankedList,
  runSmartDiscovery,
  type AiProposal,
} from '@metalayer/search-ai';

function readEditCredential(request: FastifyRequest): string | undefined {
  const header = request.headers['x-metalayer-edit-credential'];
  return Array.isArray(header) ? header[0] : header;
}

async function requireEdit(
  app: { configStore: ConfigurationStore },
  request: FastifyRequest,
  configId: string,
) {
  const credential = readEditCredential(request);
  if (!credential || !await app.configStore.verifyEditAccess(configId, credential)) {
    const exists = await app.configStore.getPublic(configId);
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

/** In-memory proposals awaiting confirmation (alpha). */
const proposalStore = new Map<string, Map<string, AiProposal>>();

function saveProposal(configId: string, proposal: AiProposal): void {
  let map = proposalStore.get(configId);
  if (!map) {
    map = new Map();
    proposalStore.set(configId, map);
  }
  map.set(proposal.id, proposal);
}

function getProposal(configId: string, proposalId: string): AiProposal | null {
  return proposalStore.get(configId)?.get(proposalId) ?? null;
}

export const searchAiRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Params: { configId: string };
    Body: { query?: string; providers?: string[] };
  }>('/configurations/:configId/search/combined', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const query = request.body?.query?.trim();
    if (!query) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'query is required',
          correlationId: request.correlationId,
        }),
      );
    }

    const providers = request.body?.providers?.length
      ? request.body.providers
      : ['tmdb', 'tvdb'];
    const providerHits = providers.map((provider) => ({
      provider,
      hits: fixtureSearchHits(query).map((hit) => ({ ...hit, provider })),
    }));

    return {
      ...combineSearchHits(query, providerHits),
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: { prompt?: string };
  }>('/configurations/:configId/search/smart-discovery', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const prompt = request.body?.prompt?.trim();
    if (!prompt) {
      return reply.status(400).send(
        createApiError({
          code: 'AI_PROMPT_INVALID',
          message: 'prompt is required',
          correlationId: request.correlationId,
        }),
      );
    }

    // Never pass vault secrets to AI — only empty/redacted context.
    const result = await runSmartDiscovery({
      prompt,
      ai: new FixtureAiProvider(),
      secrets: {
        // Prove redaction path exists without leaking real vault values.
      },
    });

    saveProposal(request.params.configId, result.proposal);

    return {
      plan: result.plan,
      proposal: result.proposal,
      usedAi: result.usedAi,
      requiresConfirmation: true,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: {
      prompt?: string;
      mediaType?: 'movie' | 'series' | 'anime';
      candidates?: Array<{
        rank: number;
        title: string;
        year?: number;
        mediaType?: 'movie' | 'series' | 'anime';
        externalIds?: Record<string, string | number>;
      }>;
    };
  }>('/configurations/:configId/search/ranked-list', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    const prompt = request.body?.prompt?.trim();
    if (!prompt) {
      return reply.status(400).send(
        createApiError({
          code: 'AI_PROMPT_INVALID',
          message: 'prompt is required',
          correlationId: request.correlationId,
        }),
      );
    }

    const ai = new FixtureAiProvider();
    const candidates =
      request.body?.candidates ??
      (await ai.proposeRankedCandidates(prompt, request.body?.mediaType ?? 'movie'));

    const result = resolveRankedList({
      prompt,
      mediaType: request.body?.mediaType,
      candidates: candidates.length ? candidates : fixtureRankedCandidates(prompt),
    });
    const proposal = createRankedListCatalogProposal(result);
    saveProposal(request.params.configId, proposal);

    return {
      ...result,
      proposal,
      requiresConfirmation: true,
      correlationId: request.correlationId,
    };
  });

  app.post<{
    Params: { configId: string };
    Body: { proposalId?: string; confirm?: boolean; name?: string };
  }>('/configurations/:configId/ai/apply-proposal', async (request, reply) => {
    const access = await requireEdit(app, request, request.params.configId);
    if (!access.ok) return reply.status(access.status).send(access.body);

    try {
      assertProposalConfirmation(request.body?.confirm);
    } catch (error) {
      if (error instanceof ProposalConfirmationRequiredError) {
        return reply.status(400).send(
          createApiError({
            code: 'AI_CONFIRMATION_REQUIRED',
            message: error.message,
            correlationId: request.correlationId,
          }),
        );
      }
      throw error;
    }

    const proposalId = request.body?.proposalId;
    if (!proposalId) {
      return reply.status(400).send(
        createApiError({
          code: 'VALIDATION_FAILED',
          message: 'proposalId is required',
          correlationId: request.correlationId,
        }),
      );
    }

    const proposal = getProposal(request.params.configId, proposalId);
    if (!proposal) {
      return reply.status(404).send(
        createApiError({
          code: 'AI_PROPOSAL_NOT_FOUND',
          message: `Proposal ${proposalId} was not found`,
          correlationId: request.correlationId,
          params: { proposalId },
        }),
      );
    }

    if (request.body?.name && proposal.catalogDraft) {
      proposal.catalogDraft = {
        ...proposal.catalogDraft,
        customName: request.body.name,
        originalName: request.body.name,
      };
    }

    const view = (await app.configStore.getPublic(request.params.configId))!;
    const applied = applyConfirmedProposal(
      proposal,
      view.config.catalogs,
      view.config.globalRules,
    );

    const updated = await app.configStore.update(request.params.configId, {
      config: {
        ...view.config,
        catalogs: applied.catalogs,
        globalRules: applied.globalRules,
      },
    });

    proposalStore.get(request.params.configId)?.delete(proposalId);

    return {
      applied: applied.applied,
      catalogs: updated?.config.catalogs ?? applied.catalogs,
      globalRules: updated?.config.globalRules ?? applied.globalRules,
      correlationId: request.correlationId,
    };
  });
};
