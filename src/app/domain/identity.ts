import type {
  ActorId,
  IsoTimestamp,
  MembershipId,
  OrganizationId,
} from './shared';

export type OrganizationKind =
  | 'educational_institution'
  | 'employer'
  | 'industry_body'
  | 'government'
  | 'training_provider'
  | 'verification_issuer';

export interface Organization {
  readonly id: OrganizationId;
  readonly legalName: string;
  readonly displayName: string;
  readonly kind: OrganizationKind;
  readonly status: 'active' | 'suspended' | 'archived';
  readonly createdAt: IsoTimestamp;
}

export type ActorRole =
  | 'learner'
  | 'faculty'
  | 'institution_admin'
  | 'recruiter'
  | 'industry_partner'
  | 'issuer_verifier'
  | 'counselor'
  | 'platform_admin'
  | 'auditor';

export interface Actor {
  readonly id: ActorId;
  readonly displayName: string;
  readonly status: 'active' | 'disabled';
}

export interface OrganizationMembership {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
  readonly roles: readonly ActorRole[];
  readonly status: 'invited' | 'active' | 'suspended' | 'ended';
  readonly validFrom: IsoTimestamp;
  readonly validUntil?: IsoTimestamp;
  readonly createdAt: IsoTimestamp;
}

export interface ActingContext {
  readonly actorId: ActorId;
  readonly role: ActorRole;
  readonly organizationId?: OrganizationId;
  readonly membershipId?: MembershipId;
}
