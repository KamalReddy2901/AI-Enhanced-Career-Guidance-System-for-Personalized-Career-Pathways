import type { ActorId, CollaborationEngagementEventId, CollaborationEngagementId, IsoTimestamp, OpportunityId, OrganizationId } from './shared';

export type CollaborationKind =
  | 'faculty_internship'
  | 'industrial_training'
  | 'faculty_development_program'
  | 'consultancy'
  | 'collaborative_research'
  | 'mentoring'
  | 'workshop'
  | 'guest_lecture'
  | 'live_project';

export interface CollaborationEngagement {
  readonly id: CollaborationEngagementId;
  readonly kind: CollaborationKind;
  readonly opportunityId?: OpportunityId;
  readonly hostOrganizationId: OrganizationId;
  readonly partnerOrganizationIds: readonly OrganizationId[];
  readonly participantActorIds: readonly ActorId[];
  readonly status: 'proposed' | 'approved' | 'active' | 'completed' | 'cancelled';
  readonly objectives: readonly string[];
  readonly startsAt?: IsoTimestamp;
  readonly endsAt?: IsoTimestamp;
}

export type CollaborationEventKind =
  | 'created'
  | 'status_transition'
  | 'milestone'
  | 'deliverable'
  | 'feedback'
  | 'outcome';

export interface CollaborationEngagementEvent {
  readonly id: CollaborationEngagementEventId;
  readonly collaborationEngagementId: CollaborationEngagementId;
  readonly sequenceNumber: number;
  readonly kind: CollaborationEventKind;
  readonly fromStatus?: CollaborationEngagement['status'];
  readonly toStatus?: CollaborationEngagement['status'];
  readonly title?: string;
  readonly detail?: string;
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly occurredAt: IsoTimestamp;
}
