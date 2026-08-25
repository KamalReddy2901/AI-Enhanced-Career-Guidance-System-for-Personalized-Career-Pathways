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
