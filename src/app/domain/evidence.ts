import type { ActorId, ConsentRecordId, EvidenceArtifactId, EvidenceRecordId, IsoTimestamp, OpportunityId, OpportunityRequirementId, OrganizationId, OutcomeEventId, SourceReference, VerificationEventId } from './shared';

export const EVIDENCE_PROVENANCE = [
  'self_declared',
  'self_reported',
  'extracted',
  'inferred',
  'assessed',
  'artifact_backed',
  'activity_observation',
  'human_attested',
  'issuer_verified',
  'outcome_linked',
] as const;

export type EvidenceProvenance = (typeof EVIDENCE_PROVENANCE)[number];

export type EvidenceProposalSource =
  | 'ai_extraction'
  | 'rule_based_extraction'
  | 'user_entry'
  | 'connector_import';

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

interface EvidenceRecordBase {
  readonly id: EvidenceRecordId;
  readonly subjectActorId: ActorId;
  readonly literalClaim: string;
  readonly provenance: EvidenceProvenance;
  readonly scope: EvidenceScope;
  readonly artifacts: readonly ArtifactReference[];
  readonly source: SourceReference;
  readonly visibility: EvidenceVisibility;
  readonly consentRecordIds: readonly ConsentRecordId[];
  readonly createdAt: IsoTimestamp;
  readonly currentVerificationEventId?: VerificationEventId;
}

/** Proposal source is orthogonal to provenance. AI extraction never implies
 * authoritative human or issuer provenance, and confirmation retains the
 * proposal source for auditability. */
export type EvidenceRecord = EvidenceRecordBase & (
  | {
      readonly verificationState: 'proposed';
      readonly proposalSource: EvidenceProposalSource;
    }
  | {
      readonly verificationState: Exclude<VerificationState, 'proposed'>;
      readonly proposalSource?: EvidenceProposalSource;
    }
);

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

/** Whether a proposal has sufficient confirmation to enter the evidence ledger.
 * This says nothing about human or issuer authority. */
export function canEnterConfirmedEvidenceLedger(record: EvidenceRecord): boolean {
  return record.verificationState === 'self_confirmed'
    || record.verificationState === 'human_verified'
    || record.verificationState === 'issuer_verified'
    || record.verificationState === 'corrected';
}
