import type { SupabaseClient } from '@supabase/supabase-js';
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
  SihTrustedApiErrorCode,
} from './types';
import { SihTrustedApiError } from './types';

interface ErrorResponse {
  ok: false;
  error: { code: SihTrustedApiErrorCode; message: string };
}

export class SihTrustedApiClient {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly workerOrigin: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  private async post<TReq, TRes>(path: string, body: TReq, method = 'POST'): Promise<TRes> {
    const { data, error } = await this.supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new SihTrustedApiError('UNAUTHENTICATED', 401, 'Sign in is required.');

    const response = await this.request(
      `${this.workerOrigin.replace(/\/$/, '')}${path}`,
      {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      },
    );
    const json = await response.json().catch(() => null) as ({ ok: true } & TRes) | ErrorResponse | null;
    if (!response.ok || !json || json.ok !== true) {
      const failure = json && json.ok === false ? json.error : null;
      throw new SihTrustedApiError(
        failure?.code ?? 'TRUSTED_PERSISTENCE_FAILURE',
        response.status,
        failure?.message ?? 'Trusted API request failed.',
      );
    }
    return json as TRes;
  }

  async recomputeReadiness(opportunityVersionId: string): Promise<RecomputeReadinessResponse['result']> {
    const res = await this.post<{ opportunityVersionId: string }, RecomputeReadinessResponse>(
      '/sih/readiness/recompute',
      { opportunityVersionId },
    );
    return res.result;
  }

  async materializeSubjectFacts(facts: MaterializeSubjectFactsRequest): Promise<MaterializeSubjectFactsResponse['subjectFacts']> {
    const res = await this.post<MaterializeSubjectFactsRequest, MaterializeSubjectFactsResponse>(
      '/sih/readiness/subject-facts',
      facts,
      'PUT',
    );
    return res.subjectFacts;
  }

  async saveEvidenceProjection(projection: SaveEvidenceProjectionRequest): Promise<SaveEvidenceProjectionResponse['projection']> {
    const res = await this.post<SaveEvidenceProjectionRequest, SaveEvidenceProjectionResponse>(
      '/sih/readiness/evidence-projections',
      projection,
    );
    return res.projection;
  }

  async registerArtifact(artifact: RegisterArtifactRequest): Promise<RegisterArtifactResponse['artifact']> {
    const res = await this.post<RegisterArtifactRequest, RegisterArtifactResponse>(
      '/sih/artifacts/register',
      artifact,
    );
    return res.artifact;
  }

  async deriveArtifactBackedEvidence(derivation: DeriveArtifactBackedEvidenceRequest): Promise<DeriveArtifactBackedEvidenceResponse['derivedEvidenceRecord']> {
    const res = await this.post<DeriveArtifactBackedEvidenceRequest, DeriveArtifactBackedEvidenceResponse>(
      '/sih/evidence/derive-artifact-backed',
      derivation,
    );
    return res.derivedEvidenceRecord;
  }

  async createAndFinalizeApplicationSnapshot(
    snapshotRequest: CreateApplicationSnapshotRequest,
  ): Promise<CreateApplicationSnapshotResponse> {
    return this.post<CreateApplicationSnapshotRequest, CreateApplicationSnapshotResponse>(
      '/sih/applications/snapshot',
      snapshotRequest,
    );
  }
}
