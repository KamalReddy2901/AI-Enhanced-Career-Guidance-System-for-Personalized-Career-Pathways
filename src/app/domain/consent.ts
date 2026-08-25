import type { ActorId, AuditEventId, ConsentRecordId, EvidenceRecordId, IsoTimestamp, OrganizationId } from './shared';

export type ConsentPurpose = 'application_review' | 'evidence_verification' | 'institution_support' | 'aggregate_analytics';

export type ProhibitedRecruiterData =
  | 'riasec'
  | 'work_values'
  | 'private_aspirations'
  | 'counselor_history'
  | 'private_constraints';

export interface ConsentRecord {
  readonly id: ConsentRecordId;
  readonly subjectActorId: ActorId;
  readonly granteeOrganizationId?: OrganizationId;
  readonly purpose: ConsentPurpose;
  readonly evidenceRecordIds: readonly EvidenceRecordId[];
  readonly status: 'granted' | 'withdrawn' | 'expired';
  readonly grantedAt: IsoTimestamp;
  readonly expiresAt?: IsoTimestamp;
  readonly withdrawnAt?: IsoTimestamp;
  readonly prohibitedRecruiterData: readonly ProhibitedRecruiterData[];
}

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly actorId: ActorId;
  readonly organizationId?: OrganizationId;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly purpose?: ConsentPurpose;
  readonly occurredAt: IsoTimestamp;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
}
