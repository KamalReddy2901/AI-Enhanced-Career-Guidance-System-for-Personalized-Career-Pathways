import type { ActorId, ApplicationEventId, ApplicationId, ApplicationSnapshotId, ConsentRecordId, EvidenceRecordId, IsoTimestamp, OpportunityId, OpportunityVersionId, OrganizationId } from './shared';

export type ApplicationStage =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'closed';

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

export interface ApplicationEvent {
  readonly id: ApplicationEventId;
  readonly applicationId: ApplicationId;
  readonly fromStage?: ApplicationStage;
  readonly toStage: ApplicationStage;
  readonly actorId: ActorId;
  readonly note?: string;
  readonly occurredAt: IsoTimestamp;
}
