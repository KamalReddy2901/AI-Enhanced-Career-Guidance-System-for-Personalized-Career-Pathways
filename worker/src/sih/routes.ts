import { authenticateAndResolveActor } from './auth';
import { createElevatedClient } from './clients';
import { recomputeAndPersistReadiness } from './readiness';
import type { RecomputeReadinessResponse, SihEnv, SihErrorBody } from './types';
import { SihRouteError } from './types';

type JsonResponder = (data: unknown, status?: number) => Response;

export interface SihRouteDependencies {
  recompute(request: Request, env: SihEnv, opportunityVersionId: string): Promise<RecomputeReadinessResponse['result']>;
}

const productionDependencies: SihRouteDependencies = {
  async recompute(request, env, opportunityVersionId) {
    const { identity, client } = await authenticateAndResolveActor(request, env);
    return recomputeAndPersistReadiness(
      client, createElevatedClient(env), identity.actorId, opportunityVersionId,
    );
  },
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorBody(error: SihRouteError): SihErrorBody {
  return { ok: false, error: { code: error.code, message: error.message } };
}

export async function handleSihRequest(
  request: Request,
  env: SihEnv,
  respond: JsonResponder,
  dependencies: SihRouteDependencies = productionDependencies,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/sih/readiness/recompute' || request.method !== 'POST') {
    return respond(errorBody(new SihRouteError('NOT_FOUND', 404, 'SIH route was not found.')), 404);
  }
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SihRouteError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SihRouteError('INVALID_REQUEST', 400, 'Request body is invalid.');
    }
    const record = body as Record<string, unknown>;
    if (Object.keys(record).length !== 1 || !uuid.test(String(record.opportunityVersionId ?? ''))) {
      throw new SihRouteError(
        'INVALID_REQUEST', 400,
        'Only a valid opportunityVersionId may be supplied.',
      );
    }
    const result = await dependencies.recompute(request, env, record.opportunityVersionId as string);
    return respond({ ok: true, result } satisfies RecomputeReadinessResponse, 200);
  } catch (error) {
    if (error instanceof SihRouteError) return respond(errorBody(error), error.status);
    return respond(errorBody(new SihRouteError(
      'TRUSTED_PERSISTENCE_FAILURE', 500, 'Trusted readiness persistence failed.',
    )), 500);
  }
}
