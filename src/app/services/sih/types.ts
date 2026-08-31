import type {
  OpportunityReadinessResult,
  ReadinessSubjectInput,
} from "../../domain/readiness";
import type {
  ActorId,
  ActorRole,
  ApplicationId,
  ApplicationStage,
  ConsentPurpose,
  ConsentRecordId,
  EvidenceProvenance,
  EvidenceProposalSource,
  EvidenceRecordId,
  EvidenceVisibility,
  OrganizationId,
  VerificationAction,
  VerificationState,
} from "../../domain";
import type { ProductionRecruiterProjection } from "./productionRecruiterProjection";

export type EvidenceScopeReadModel =
  | {
      readonly kind: "global_skill";
      readonly skillId?: string;
      readonly literalSkillLabel: string;
    }
  | {
      readonly kind: "opportunity";
      readonly opportunityId: string;
      readonly requirementId?: string;
    }
  | { readonly kind: "organization"; readonly organizationId: string }
  | { readonly kind: "outcome"; readonly outcomeEventId: string };

/** Browser-facing evidence row. This is deliberately not the canonical
 * EvidenceRecord because artifacts and consent links are separately RLS-bound. */
export interface EvidenceRecordReadModel {
  readonly id: EvidenceRecordId;
  readonly subjectActorId: string;
  readonly literalClaim: string;
  readonly provenance: EvidenceProvenance;
  readonly initialVerificationState: VerificationState;
  readonly proposalSource?: EvidenceProposalSource;
  readonly scope: EvidenceScopeReadModel;
  readonly source: {
    readonly system: string;
    readonly recordId?: string;
    readonly url?: string;
    readonly capturedAt: string;
  };
  readonly visibility: EvidenceVisibility;
  readonly createdAt: string;
}

export interface EvidenceArtifactReadModel {
  readonly id: string;
  readonly evidenceRecordId: string;
  readonly mediaType: string;
  readonly displayName: string;
  readonly storageBucketId: string;
  readonly storageObjectPath: string;
  readonly integrityFingerprint?: string;
  readonly scanStatus:
    "pending" | "clean" | "quarantined" | "rejected" | "not_scanned";
  readonly linkedAt: string;
  readonly createdAt: string;
}

export type VerificationRequestStatus =
  "requested" | "accepted" | "closed" | "cancelled";

export interface VerificationRequestReadModel {
  readonly id: string;
  readonly evidenceRecordId: string;
  readonly subjectActorId: string;
  readonly requestedVerifierActorId?: string;
  readonly requestedVerifierOrganizationId?: string;
  readonly consentGrantId: string;
  readonly scope: EvidenceScopeReadModel;
  readonly status: VerificationRequestStatus;
  readonly requestedAt: string;
  readonly expiresAt?: string;
  readonly closedAt?: string;
}

export interface VerificationEventReadModel {
  readonly id: string;
  readonly verificationRequestId: string;
  readonly evidenceRecordId: string;
  readonly action: VerificationAction;
  readonly actorId: string;
  readonly actorOrganizationId?: string;
  readonly reason?: string;
  readonly supersedesEventId?: string;
  readonly occurredAt: string;
}

export type TerminalVerificationDecisionAction =
  "verified_by_human" | "verified_by_issuer" | "disputed";

export interface CompleteVerificationRequestDecisionInput {
  readonly verificationRequestId: string;
  readonly evidenceRecordId: EvidenceRecordId;
  readonly action: TerminalVerificationDecisionAction;
  readonly actorOrganizationId: OrganizationId;
  readonly reason?: string;
}

export interface CompleteVerificationRequestDecisionResult {
  readonly verificationRequest: VerificationRequestReadModel;
  readonly verificationEvent: VerificationEventReadModel;
}

export interface CreateVerificationRequestWithConsentResult {
  readonly verificationRequestId: string;
  readonly consentGrantId: ConsentRecordId;
}

export interface VerifierActingContextReadModel {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly roles: readonly Extract<ActorRole, "faculty" | "issuer_verifier">[];
}

export interface ApplicationReadModel {
  readonly id: ApplicationId;
  readonly applicantActorId: string;
  readonly opportunityId: string;
  readonly opportunityVersionId: string;
  readonly ownerOrganizationId: string;
  readonly initialStage: "saved" | "preparing";
  readonly currentStage: ApplicationStage;
  readonly createdAt: string;
}

export interface ApplicationSnapshotReadModel {
  readonly id: string;
  readonly applicationId: ApplicationId;
  readonly opportunityVersionId: string;
  readonly readinessResultId: string;
  readonly engineVersion: string;
  readonly evidencePolicyVersion: string;
  readonly recruiterProjectionVersion: string;
  readonly capturedAt: string;
  readonly integrityFingerprint: string;
  readonly finalizedAt: string;
  readonly selectedEvidenceRecordIds: readonly EvidenceRecordId[];
}

export interface ApplicationEventReadModel {
  readonly id: string;
  readonly applicationId: ApplicationId;
  readonly fromStage: ApplicationStage;
  readonly toStage: ApplicationStage;
  readonly eventKind: "stage_transition" | "human_rejection";
  readonly applicationSnapshotId?: string;
  readonly actorId: string;
  readonly reason?: string;
  readonly note?: string;
  readonly occurredAt: string;
}

export type ApplicationRecruitmentRecordKind =
  | "stage_transition"
  | "evidence_request"
  | "evidence_response"
  | "interview_scheduled"
  | "interview_completed"
  | "offer"
  | "outcome"
  | "feedback"
  | "recruiter_note";

export type ApplicationOutcomeKind =
  | "selected"
  | "joined"
  | "completed"
  | "credential_awarded"
  | "project_delivered"
  | "placement_confirmed"
  | "engagement_completed";

export interface ApplicationRecruitmentRecordReadModel {
  readonly id: string;
  readonly applicationId: ApplicationId;
  readonly applicationEventId?: string;
  readonly outcomeEventId?: string;
  readonly kind: ApplicationRecruitmentRecordKind;
  readonly actorId: string;
  readonly actorOrganizationId?: string;
  readonly visibility: "applicant_and_recruiter" | "recruiter_internal";
  readonly message?: string;
  readonly scheduledAt?: string;
  readonly scheduleTimezone?: string;
  readonly interactionMode?: string;
  readonly locationReference?: string;
  readonly expiresAt?: string;
  readonly outcomeKind?: ApplicationOutcomeKind;
  readonly occurredAt: string;
}

export interface ConsentGrantReadModel {
  readonly id: ConsentRecordId;
  readonly subjectActorId: string;
  readonly granteeOrganizationId: string;
  readonly purpose: Extract<ConsentPurpose, "application_review">;
  readonly evidenceRecordIds: readonly EvidenceRecordId[];
  readonly status: "granted" | "withdrawn" | "expired";
  readonly grantedAt: string;
  readonly expiresAt?: string;
  readonly withdrawnAt?: string;
}

export type SihTrustedApiErrorCode =
  | "UNAUTHENTICATED"
  | "NO_ACTIVE_SIH_ACTOR"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "UNCONFIRMED_OPPORTUNITY"
  | "INVALID_EVIDENCE_PROJECTION"
  | "ARTIFACT_NOT_FOUND"
  | "ARTIFACT_PATH_MISMATCH"
  | "ARTIFACT_NOT_USABLE"
  | "CONSENT_REQUIRED"
  | "SNAPSHOT_CONFLICT"
  | "TRUSTED_PERSISTENCE_FAILURE";

export interface RecomputeReadinessRequest {
  opportunityVersionId: string;
}

export interface RecomputeReadinessResponse {
  ok: true;
  result: OpportunityReadinessResult;
}

export interface MaterializeSubjectFactsRequest {
  educationLevel?:
    | "below_10"
    | "class_10"
    | "class_12"
    | "iti_diploma"
    | "undergraduate"
    | "postgraduate";
  educationLevelConfirmed?: boolean;
  graduationYear?: number;
  graduationYearConfirmed?: boolean;
  physicalPresenceLocations?: Array<{ value: string; confirmed: boolean }>;
  physicalPresenceLocationsComplete?: boolean;
  eligibilityFacts?: Array<{
    kind: "availability" | "licence_registration" | "explicit_prerequisite";
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
  capabilityAssertion?:
    "supports" | "partial" | "does_not_meet" | "not_applicable";
  directness: "direct" | "explicit_claim" | "indirect";
  observedAt: string;
  confirmationMethod:
    | "structured_human_entry"
    | "ai_assisted_review"
    | "direct_confirmation"
    | "self_assessment_review";
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
  derivedEvidenceId?: string;
  sourceEvidenceRecordId: string;
  artifactId: string;
  literalClaim?: string;
  derivationKind: string;
  confirmationMethod:
    | "structured_human_entry"
    | "ai_assisted_review"
    | "direct_confirmation"
    | "self_assessment_review";
}

export interface DeriveArtifactBackedEvidenceResponse {
  ok: true;
  derivedEvidenceRecord: Record<string, unknown>;
}

export class SihTrustedApiError extends Error {
  constructor(
    readonly code: SihTrustedApiErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SihTrustedApiError";
  }
}
