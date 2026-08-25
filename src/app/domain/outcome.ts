import type { ActorId, ApplicationId, ApplicationSnapshotId, EvidenceRecordId, IsoTimestamp, OpportunityId, OrganizationId, OutcomeEventId } from './shared';
import type { EvidenceScope } from './evidence';

export type OutcomeKind =
  | 'selected'
  | 'joined'
  | 'completed'
  | 'credential_awarded'
  | 'project_delivered'
  | 'placement_confirmed'
  | 'engagement_completed';

export interface OutcomeLinkedEvidenceEmission {
  readonly literalClaim: string;
  readonly scope: EvidenceScope;
  readonly requiresHumanConfirmation: boolean;
  readonly generatedEvidenceRecordId?: EvidenceRecordId;
}

export interface OutcomeEvent {
  readonly id: OutcomeEventId;
  readonly kind: OutcomeKind;
  readonly subjectActorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly opportunityId?: OpportunityId;
  readonly applicationId?: ApplicationId;
  /** Historical snapshots are references only and are never rewritten. */
  readonly historicalApplicationSnapshotIds: readonly ApplicationSnapshotId[];
  readonly evidenceEmissions: readonly OutcomeLinkedEvidenceEmission[];
  readonly recordedBy: ActorId;
  readonly occurredAt: IsoTimestamp;
}
