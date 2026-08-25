import type { ActorId, ApplicationEventId, ApplicationId, ApplicationSnapshotId, ConsentRecordId, EvidenceRecordId, IsoTimestamp, OpportunityId, OpportunityVersionId, OrganizationId } from './shared';

export const APPLICATION_STAGES = [
  'saved',
  'preparing',
  'applied',
  'screening',
  'evidence_requested',
  'under_review',
  'interview',
  'shortlisted',
  'offered',
  'accepted',
  'declined',
  'rejected_by_human',
  'withdrawn',
  'active',
  'completed',
  'cancelled',
  'outcome_recorded',
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export interface Application {
  readonly id: ApplicationId;
  readonly applicantActorId: ActorId;
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly ownerOrganizationId: OrganizationId;
  readonly currentStage: ApplicationStage;
  readonly currentSnapshotId?: ApplicationSnapshotId;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Immutable evidence and requirement selection at the moment of submission. */
export interface ApplicationSnapshot {
  readonly id: ApplicationSnapshotId;
  readonly applicationId: ApplicationId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly evidenceRecordIds: readonly EvidenceRecordId[];
  readonly requirementResponses: Readonly<Record<string, string>>;
  readonly consentRecordIds: readonly ConsentRecordId[];
  readonly capturedAt: IsoTimestamp;
  readonly contentHash: string;
}

interface ApplicationEventBase {
  readonly id: ApplicationEventId;
  readonly applicationId: ApplicationId;
  readonly fromStage?: ApplicationStage;
  readonly actorId: ActorId;
  readonly note?: string;
  readonly occurredAt: IsoTimestamp;
}

export interface ApplicationTransitionEvent extends ApplicationEventBase {
  readonly eventKind: 'stage_transition';
  readonly toStage: Exclude<ApplicationStage, 'rejected_by_human'>;
}

/** A rejection is always an attributable human decision. There is deliberately
 * no automatic/system rejection event in the canonical application contract. */
export interface HumanRejectionApplicationEvent extends ApplicationEventBase {
  readonly eventKind: 'human_rejection';
  readonly toStage: 'rejected_by_human';
  readonly reason: string;
}

export type ApplicationEvent = ApplicationTransitionEvent | HumanRejectionApplicationEvent;
