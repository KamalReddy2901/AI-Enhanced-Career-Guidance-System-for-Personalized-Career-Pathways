export type DomainId<Kind extends string> = string & { readonly __domainKind: Kind };

export type OrganizationId = DomainId<'Organization'>;
export type MembershipId = DomainId<'OrganizationMembership'>;
export type ActorId = DomainId<'Actor'>;
export type OpportunityId = DomainId<'Opportunity'>;
export type OpportunityVersionId = DomainId<'OpportunityVersion'>;
export type OpportunityRequirementId = DomainId<'OpportunityRequirement'>;
export type EvidenceRecordId = DomainId<'EvidenceRecord'>;
export type EvidenceArtifactId = DomainId<'EvidenceArtifact'>;
export type VerificationEventId = DomainId<'VerificationEvent'>;
export type ApplicationId = DomainId<'Application'>;
export type ApplicationSnapshotId = DomainId<'ApplicationSnapshot'>;
export type ApplicationEventId = DomainId<'ApplicationEvent'>;
export type ConsentRecordId = DomainId<'ConsentRecord'>;
export type AuditEventId = DomainId<'AuditEvent'>;
export type CollaborationEngagementId = DomainId<'CollaborationEngagement'>;
export type OutcomeEventId = DomainId<'OutcomeEvent'>;
export type OpportunityReadinessResultId = DomainId<'OpportunityReadinessResult'>;
export type InstitutionInterventionId = DomainId<'InstitutionIntervention'>;
export type InstitutionInterventionEventId = DomainId<'InstitutionInterventionEvent'>;
export type InstitutionInterventionFollowupId = DomainId<'InstitutionInterventionFollowup'>;

export type IsoDate = string & { readonly __isoDate: true };
export type IsoTimestamp = string & { readonly __isoTimestamp: true };

export interface VersionStamp {
  readonly version: number;
  readonly createdAt: IsoTimestamp;
  readonly createdBy: ActorId;
}

export interface SourceReference {
  readonly sourceSystem: string;
  readonly sourceRecordId?: string;
  readonly sourceUrl?: string;
  readonly capturedAt: IsoTimestamp;
}

export const HUMAN_CONFIRMATION_METHODS = [
  'structured_human_entry',
  'ai_assisted_review',
  'connector_review',
  'controlled_fixture',
] as const;
export type HumanConfirmationMethod = (typeof HUMAN_CONFIRMATION_METHODS)[number];

/** Audit-ready confirmation of high-impact authored structure. Unconfirmed
 * content cannot claim a confirming actor, time, or method. */
export type HumanConfirmationTrace =
  | {
    readonly humanConfirmed: false;
    readonly confirmedByActorId?: never;
    readonly confirmedAt?: never;
    readonly confirmationMethod?: never;
  }
  | {
    readonly humanConfirmed: true;
    readonly confirmedByActorId: ActorId;
    readonly confirmedAt: IsoTimestamp;
    readonly confirmationMethod: HumanConfirmationMethod;
  };
