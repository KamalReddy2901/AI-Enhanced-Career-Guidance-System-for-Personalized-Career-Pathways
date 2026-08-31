import { authenticateAndResolveActor } from './auth';
import { createElevatedClient } from './clients';
import {
  materializeSubjectFacts,
  recomputeAndPersistReadiness,
  saveEvidenceProjection,
} from './readiness';
import { deriveArtifactBackedEvidence, registerArtifact } from './artifacts';
import { createAndFinalizeApplicationSnapshot } from './applications';
import {
  createQuestionnaireAtomic,
  createQuestionnaireSuccessorDraft,
  publishQuestionnaireAtomic,
  submitQuestionnaireAtomic,
  updateQuestionnaireDraftAtomic,
  type CreateQuestionnaireRequest,
  type CreateQuestionnaireSuccessorRequest,
  type PublishQuestionnaireRequest,
  type SubmitQuestionnaireRequest,
  type UpdateQuestionnaireDraftRequest,
} from './questionnaires';
import type {
  CreateApplicationSnapshotRequest,
  CreateApplicationSnapshotResponse,
  DeriveArtifactBackedEvidenceRequest,
  DeriveArtifactBackedEvidenceResponse,
  MaterializeSubjectFactsRequest,
  MaterializeSubjectFactsResponse,
  RecomputeReadinessResponse,
  RegisterArtifactRequest,
  RegisterArtifactResponse,
  SaveEvidenceProjectionRequest,
  SaveEvidenceProjectionResponse,
  SihEnv,
  SihErrorBody,
} from './types';
import { SihRouteError } from './types';

type JsonResponder = (data: unknown, status?: number) => Response;

export interface SihRouteDependencies {
  recompute(request: Request, env: SihEnv, opportunityVersionId: string): Promise<RecomputeReadinessResponse['result']>;
  materializeSubjectFacts?(request: Request, env: SihEnv, facts: MaterializeSubjectFactsRequest): Promise<MaterializeSubjectFactsResponse['subjectFacts']>;
  saveEvidenceProjection?(request: Request, env: SihEnv, projection: SaveEvidenceProjectionRequest): Promise<SaveEvidenceProjectionResponse['projection']>;
  registerArtifact?(request: Request, env: SihEnv, artifact: RegisterArtifactRequest): Promise<RegisterArtifactResponse['artifact']>;
  deriveArtifactBackedEvidence?(request: Request, env: SihEnv, derivation: DeriveArtifactBackedEvidenceRequest): Promise<DeriveArtifactBackedEvidenceResponse['derivedEvidenceRecord']>;
  createApplicationSnapshot?(request: Request, env: SihEnv, snapshotRequest: CreateApplicationSnapshotRequest): Promise<CreateApplicationSnapshotResponse>;
  createQuestionnaire?(request: Request, env: SihEnv, questionnaireRequest: CreateQuestionnaireRequest): Promise<{ questionnaireId: string; versionId: string }>;
  createQuestionnaireSuccessor?(request: Request, env: SihEnv, successorRequest: CreateQuestionnaireSuccessorRequest): Promise<{ questionnaireId: string; sourceVersionId: string; successorVersionId: string; versionNumber: number }>;
  updateQuestionnaireDraft?(request: Request, env: SihEnv, draftRequest: UpdateQuestionnaireDraftRequest): Promise<{ questionnaireId: string; versionId: string }>;
  publishQuestionnaire?(request: Request, env: SihEnv, publishRequest: PublishQuestionnaireRequest): Promise<{ questionnaireId: string; versionId: string; publishedAt: string }>;
  submitQuestionnaire?(request: Request, env: SihEnv, submitRequest: SubmitQuestionnaireRequest): Promise<{ submissionId: string; submittedAt: string; computedScore: number | null; maxScore: number | null }>;
}

const productionDependencies: SihRouteDependencies = {
  async recompute(request, env, opportunityVersionId) {
    const { identity, client } = await authenticateAndResolveActor(request, env);
    return recomputeAndPersistReadiness(
      client, createElevatedClient(env), identity.actorId, opportunityVersionId,
    );
  },
  async materializeSubjectFacts(request, env, facts) {
    const { identity } = await authenticateAndResolveActor(request, env);
    return materializeSubjectFacts(createElevatedClient(env), identity.actorId, facts);
  },
  async saveEvidenceProjection(request, env, projection) {
    const { identity } = await authenticateAndResolveActor(request, env);
    return saveEvidenceProjection(createElevatedClient(env), identity.actorId, projection);
  },
  async registerArtifact(request, env, artifact) {
    const { identity } = await authenticateAndResolveActor(request, env);
    return registerArtifact(createElevatedClient(env), env, identity.actorId, artifact);
  },
  async deriveArtifactBackedEvidence(request, env, derivation) {
    const { identity } = await authenticateAndResolveActor(request, env);
    return deriveArtifactBackedEvidence(createElevatedClient(env), identity.actorId, derivation);
  },
  async createApplicationSnapshot(request, env, snapshotRequest) {
    const { identity, client } = await authenticateAndResolveActor(request, env);
    return createAndFinalizeApplicationSnapshot(client, createElevatedClient(env), identity.actorId, snapshotRequest);
  },
  async createQuestionnaire(request, env, questionnaireRequest) {
    const { client } = await authenticateAndResolveActor(request, env);
    return createQuestionnaireAtomic(client, questionnaireRequest);
  },
  async createQuestionnaireSuccessor(request, env, successorRequest) {
    const { client } = await authenticateAndResolveActor(request, env);
    return createQuestionnaireSuccessorDraft(client, successorRequest);
  },
  async updateQuestionnaireDraft(request, env, draftRequest) {
    const { client } = await authenticateAndResolveActor(request, env);
    return updateQuestionnaireDraftAtomic(client, draftRequest);
  },
  async publishQuestionnaire(request, env, publishRequest) {
    const { client } = await authenticateAndResolveActor(request, env);
    return publishQuestionnaireAtomic(client, publishRequest);
  },
  async submitQuestionnaire(request, env, submitRequest) {
    const { client } = await authenticateAndResolveActor(request, env);
    return submitQuestionnaireAtomic(client, submitRequest);
  },
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorBody(error: SihRouteError): SihErrorBody {
  return { ok: false, error: { code: error.code, message: error.message } };
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new SihRouteError('INVALID_REQUEST', 400, 'Request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SihRouteError('INVALID_REQUEST', 400, 'Request body is invalid.');
  }
  return body as Record<string, unknown>;
}

export async function handleSihRequest(
  request: Request,
  env: SihEnv,
  respond: JsonResponder,
  dependencies: SihRouteDependencies = productionDependencies,
): Promise<Response> {
  const url = new URL(request.url);

  try {
    const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
    if (declaredLength > 65_536) {
      throw new SihRouteError('INVALID_REQUEST', 413, 'Request body exceeds the 64 KiB limit.');
    }
    if (env.SIH_RATE_LIMITER) {
      const callerKey = request.headers.get('Authorization') ?? 'unauthenticated';
      const { success } = await env.SIH_RATE_LIMITER.limit({ key: `${callerKey}:${url.pathname}` });
      if (!success) throw new SihRouteError('RATE_LIMITED', 429, 'Too many requests. Retry shortly.');
    }
    // 1. Recompute readiness
    if (url.pathname === '/sih/readiness/recompute' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (Object.keys(record).length !== 1 || !uuid.test(String(record.opportunityVersionId ?? ''))) {
        throw new SihRouteError(
          'INVALID_REQUEST', 400,
          'Only a valid opportunityVersionId may be supplied.',
        );
      }
      const result = await dependencies.recompute(request, env, record.opportunityVersionId as string);
      return respond({ ok: true, result } satisfies RecomputeReadinessResponse, 200);
    }

    // 2. Materialize subject facts
    if (url.pathname === '/sih/readiness/subject-facts' && request.method === 'PUT') {
      const record = await parseJsonBody(request);
      const subjectFacts = await (dependencies.materializeSubjectFacts ?? productionDependencies.materializeSubjectFacts!)(
        request, env, record as MaterializeSubjectFactsRequest,
      );
      return respond({ ok: true, subjectFacts } satisfies MaterializeSubjectFactsResponse, 200);
    }

    // 3. Save readiness evidence projection
    if (url.pathname === '/sih/readiness/evidence-projections' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.evidenceRecordId ?? ''))) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid evidenceRecordId is required.');
      }
      const projection = await (dependencies.saveEvidenceProjection ?? productionDependencies.saveEvidenceProjection!)(
        request, env, record as unknown as SaveEvidenceProjectionRequest,
      );
      return respond({ ok: true, projection } satisfies SaveEvidenceProjectionResponse, 200);
    }

    // 4. Register artifact
    if (url.pathname === '/sih/artifacts/register' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.artifactId ?? '')) || typeof record.storageObjectPath !== 'string') {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid artifactId and storageObjectPath are required.');
      }
      const artifact = await (dependencies.registerArtifact ?? productionDependencies.registerArtifact!)(
        request, env, record as unknown as RegisterArtifactRequest,
      );
      return respond({ ok: true, artifact } satisfies RegisterArtifactResponse, 200);
    }

    // 5. Derive artifact-backed evidence
    if (url.pathname === '/sih/evidence/derive-artifact-backed' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.sourceEvidenceRecordId ?? '')) || !uuid.test(String(record.artifactId ?? ''))) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid sourceEvidenceRecordId and artifactId are required.');
      }
      const derived = await (dependencies.deriveArtifactBackedEvidence ?? productionDependencies.deriveArtifactBackedEvidence!)(
        request, env, record as unknown as DeriveArtifactBackedEvidenceRequest,
      );
      return respond({ ok: true, derivedEvidenceRecord: derived } satisfies DeriveArtifactBackedEvidenceResponse, 200);
    }

    // 6. Application snapshot
    if (url.pathname === '/sih/applications/snapshot' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.applicationId ?? '')) ||
          !uuid.test(String(record.opportunityVersionId ?? '')) ||
          !uuid.test(String(record.consentGrantId ?? '')) ||
          !Array.isArray(record.selectedEvidenceRecordIds)) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid applicationId, opportunityVersionId, consentGrantId, and selectedEvidenceRecordIds are required.');
      }
      const snapshot = await (dependencies.createApplicationSnapshot ?? productionDependencies.createApplicationSnapshot!)(
        request, env, record as unknown as CreateApplicationSnapshotRequest,
      );
      return respond(snapshot, 200);
    }

    // 7. Create questionnaire
    if (url.pathname === '/sih/questionnaires/create' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.organizationId ?? '')) ||
          typeof record.title !== 'string' ||
          typeof record.description !== 'string' ||
          !Array.isArray(record.questions)) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid organizationId, title, description, and questions array are required.');
      }
      const result = await (dependencies.createQuestionnaire ?? productionDependencies.createQuestionnaire!)(
        request, env, record as unknown as CreateQuestionnaireRequest,
      );
      return respond({ ok: true, ...result }, 200);
    }

    // 8. Publish questionnaire
    if (url.pathname === '/sih/questionnaires/successor' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.sourceVersionId ?? ''))) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid sourceVersionId is required.');
      }
      const result = await (dependencies.createQuestionnaireSuccessor ?? productionDependencies.createQuestionnaireSuccessor!)(
        request, env, record as unknown as CreateQuestionnaireSuccessorRequest,
      );
      return respond({ ok: true, ...result }, 200);
    }

    if (url.pathname === '/sih/questionnaires/draft' && request.method === 'PUT') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.versionId ?? '')) ||
          typeof record.title !== 'string' || typeof record.description !== 'string' ||
          !Array.isArray(record.questions)) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid versionId, title, description, and questions are required.');
      }
      const result = await (dependencies.updateQuestionnaireDraft ?? productionDependencies.updateQuestionnaireDraft!)(
        request, env, record as unknown as UpdateQuestionnaireDraftRequest,
      );
      return respond({ ok: true, ...result }, 200);
    }

    // 10. Publish questionnaire
    if (url.pathname === '/sih/questionnaires/publish' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.versionId ?? ''))) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid versionId is required.');
      }
      const result = await (dependencies.publishQuestionnaire ?? productionDependencies.publishQuestionnaire!)(
        request, env, record as unknown as PublishQuestionnaireRequest,
      );
      return respond({ ok: true, ...result }, 200);
    }

    // 9. Submit questionnaire
    if (url.pathname === '/sih/questionnaires/submit' && request.method === 'POST') {
      const record = await parseJsonBody(request);
      if (!uuid.test(String(record.submissionId ?? ''))) {
        throw new SihRouteError('INVALID_REQUEST', 400, 'Valid submissionId is required.');
      }
      const result = await (dependencies.submitQuestionnaire ?? productionDependencies.submitQuestionnaire!)(
        request, env, record as unknown as SubmitQuestionnaireRequest,
      );
      return respond({ ok: true, ...result }, 200);
    }

    return respond(errorBody(new SihRouteError('NOT_FOUND', 404, 'SIH route was not found.')), 404);
  } catch (error) {
    if (error instanceof SihRouteError) return respond(errorBody(error), error.status);
    return respond(errorBody(new SihRouteError(
      'TRUSTED_PERSISTENCE_FAILURE', 500, 'Trusted persistence operation failed.',
    )), 500);
  }
}
