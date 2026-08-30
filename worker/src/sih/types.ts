import type { OpportunityReadinessResult } from '../../../src/app/domain/readiness';
import type { ProductionRecruiterProjection } from '../../../src/app/services/sih/productionRecruiterProjection';

export interface SihEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_ELEVATED_KEY?: string;
  /** Explicit server-only compatibility alias for local/legacy deployments. */
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SIH_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

export type SihErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_ACTIVE_SIH_ACTOR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'UNCONFIRMED_OPPORTUNITY'
  | 'INVALID_EVIDENCE_PROJECTION'
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_PATH_MISMATCH'
  | 'ARTIFACT_NOT_USABLE'
  | 'CONSENT_REQUIRED'
  | 'SNAPSHOT_CONFLICT'
  | 'TRUSTED_PERSISTENCE_FAILURE';

export interface SihErrorBody {
  ok: false;
  error: { code: SihErrorCode; message: string };
}

export interface RecomputeReadinessRequest {
  opportunityVersionId: string;
}

export interface RecomputeReadinessResponse {
  ok: true;
  result: OpportunityReadinessResult;
}

export interface MaterializeSubjectFactsRequest {
  educationLevel?: 'below_10' | 'class_10' | 'class_12' | 'iti_diploma' | 'undergraduate' | 'postgraduate';
  educationLevelConfirmed?: boolean;
  graduationYear?: number;
  graduationYearConfirmed?: boolean;
  physicalPresenceLocations?: Array<{ value: string; confirmed: boolean }>;
  physicalPresenceLocationsComplete?: boolean;
  eligibilityFacts?: Array<{
    kind: 'availability' | 'licence_registration' | 'explicit_prerequisite';
    key: string;
    value: string | boolean;
    confirmed: boolean;
  }>;
  workAuthorizations?: Array<{
    jurisdiction: string;
    authorized: boolean;
    confirmed: boolean;
  }>;
  relevantLanguages?: Array<{ value: string; confirmed: boolean }>;
  relevantLanguagesComplete?: boolean;
}

export interface MaterializeSubjectFactsResponse {
  ok: true;
  subjectFacts: Record<string, unknown>;
}

export interface SaveEvidenceProjectionRequest {
  evidenceRecordId: string;
  requirementId?: string;
  skillId?: string;
  literalSkillLabel?: string;
  literalRequirementWording?: string;
  proficiency?: number;
  experienceYears?: number;
  capabilityAssertion?: 'supports' | 'partial' | 'does_not_meet' | 'not_applicable';
  directness: 'direct' | 'explicit_claim' | 'indirect';
  observedAt: string;
  /** Canonical human confirmation methods: structured_human_entry, ai_assisted_review. */
  confirmationMethod: 'structured_human_entry' | 'ai_assisted_review';
}

export interface SaveEvidenceProjectionResponse {
  ok: true;
  projection: Record<string, unknown>;
}

export interface RegisterArtifactRequest {
  artifactId: string;
  evidenceRecordId?: string;
  storageObjectPath: string;
  displayName: string;
  mediaType: string;
}

export interface RegisterArtifactResponse {
  ok: true;
  artifact: {
    id: string;
    subjectActorId: string;
    storageBucketId: string;
    storageObjectPath: string;
    mediaType: string;
    displayName: string;
    integrityFingerprint: string;
    scanStatus: string;
    createdAt: string;
  };
}

export interface CreateApplicationSnapshotRequest {
  applicationId: string;
  opportunityVersionId: string;
  selectedEvidenceRecordIds: string[];
  consentGrantId: string;
  requirementResponses?: Record<string, unknown>;
}

export interface CreateApplicationSnapshotResponse {
  ok: true;
  snapshotId: string;
  integrityFingerprint: string;
  finalizedAt: string;
  recruiterProjection: ProductionRecruiterProjection;
}

export interface DeriveArtifactBackedEvidenceRequest {
  sourceEvidenceRecordId: string;
  artifactId: string;
  literalClaim?: string;
  /** Only canonical production methods; direct_confirmation and self_assessment_review are not permitted. */
  confirmationMethod: 'structured_human_entry' | 'ai_assisted_review';
}

export interface DeriveArtifactBackedEvidenceResponse {
  ok: true;
  derivedEvidenceRecord: Record<string, unknown>;
}

export class SihRouteError extends Error {
  constructor(
    readonly code: SihErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SihRouteError';
  }
}

export interface RequestIdentity {
  accessToken: string;
  authUserId: string;
  actorId: string;
}
