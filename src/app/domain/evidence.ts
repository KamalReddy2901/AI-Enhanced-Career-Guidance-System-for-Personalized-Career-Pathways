import type { ActorId, ConsentRecordId, EvidenceArtifactId, EvidenceRecordId, IsoTimestamp, OpportunityId, OpportunityRequirementId, OrganizationId, OutcomeEventId, SourceReference, VerificationEventId } from './shared';

export type EvidenceProvenance =
  | 'self_reported'
  | 'ai_proposed'
  | 'assessment_result'
  | 'activity_observation'
  | 'human_attestation'
  | 'issuer_record'
  | 'outcome_linked';

export type VerificationState =
  | 'proposed'
  | 'unverified'
  | 'self_confirmed'
  | 'human_verified'
  | 'issuer_verified'
  | 'disputed'
  | 'revoked'
  | 'corrected';

export type EvidenceScope =
  | { readonly kind: 'global_skill'; readonly skillId?: string; readonly literalSkillLabel: string }
  | { readonly kind: 'opportunity'; readonly opportunityId: OpportunityId; readonly requirementId?: OpportunityRequirementId }
  | { readonly kind: 'organization'; readonly organizationId: OrganizationId }
  | { readonly kind: 'outcome'; readonly outcomeEventId: OutcomeEventId };

export interface ArtifactReference {
  readonly id: EvidenceArtifactId;
  readonly mediaType: string;
  readonly storageReference: string;
  readonly checksum?: string;
  readonly displayName: string;
}

export type EvidenceVisibility = 'private' | 'consented_application' | 'organization_scoped' | 'public';

export interface EvidenceRecord {
  readonly id: EvidenceRecordId;
  readonly subjectActorId: ActorId;
  readonly literalClaim: string;
  readonly provenance: EvidenceProvenance;
  readonly verificationState: VerificationState;
  readonly scope: EvidenceScope;
  readonly artifacts: readonly ArtifactReference[];
  readonly source: SourceReference;
  readonly visibility: EvidenceVisibility;
  readonly consentRecordIds: readonly ConsentRecordId[];
  readonly createdAt: IsoTimestamp;
  readonly currentVerificationEventId?: VerificationEventId;
}

export type VerificationAction =
  | 'submitted_for_review'
  | 'self_confirmed'
  | 'verified_by_human'
  | 'verified_by_issuer'
  | 'disputed'
  | 'revoked'
  | 'corrected';

/** Verification events are immutable journal entries; corrections append a new
 * event referencing the superseded event rather than overwriting history. */
export interface VerificationEvent {
  readonly id: VerificationEventId;
  readonly evidenceRecordId: EvidenceRecordId;
  readonly action: VerificationAction;
  readonly actorId: ActorId;
  readonly actorOrganizationId?: OrganizationId;
  readonly scope: EvidenceScope;
  readonly reason?: string;
  readonly occurredAt: IsoTimestamp;
  readonly supersedesEventId?: VerificationEventId;
}

export function canEnterAuthoritativeEvidenceState(record: EvidenceRecord): boolean {
  return record.verificationState === 'self_confirmed'
    || record.verificationState === 'human_verified'
    || record.verificationState === 'issuer_verified'
    || record.verificationState === 'corrected';
}
