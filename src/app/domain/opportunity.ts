import type { IsoTimestamp, OrganizationId, OpportunityId, OpportunityRequirementId, OpportunityVersionId, SourceReference, VersionStamp } from './shared';
import type { CanonicalResolutionState } from './skillResolution';

export type OpportunityType =
  | 'job'
  | 'internship'
  | 'apprenticeship'
  | 'industrial_training'
  | 'faculty_internship'
  | 'live_project'
  | 'mentoring'
  | 'workshop'
  | 'guest_lecture'
  | 'fdp'
  | 'consultancy'
  | 'collaborative_research';

export type OpportunityAudience = 'student' | 'alumni' | 'faculty' | 'professional' | 'institution';
export type RequirementPriority = 'required' | 'preferred';

export type EligibilityRule =
  | { readonly kind: 'education_level'; readonly operator: 'at_least' | 'equals'; readonly value: string }
  | { readonly kind: 'graduation_year'; readonly operator: 'before' | 'after' | 'between'; readonly value: number | readonly [number, number] }
  | { readonly kind: 'location'; readonly operator: 'in' | 'not_in'; readonly values: readonly string[] }
  | { readonly kind: 'organization_membership'; readonly organizationIds: readonly OrganizationId[] }
  | { readonly kind: 'custom'; readonly literalSourceWording: string; readonly machineEnforced: false };

export type RequirementEvidenceState =
  | 'UNKNOWN'
  | 'EVIDENCE_PRESENT'
  | 'GAP'
  | 'NOT_APPLICABLE';

export interface OpportunityRequirement {
  readonly id: OpportunityRequirementId;
  readonly priority: RequirementPriority;
  readonly literalSourceWording: string;
  readonly canonicalResolution: CanonicalResolutionState;
  readonly minimumProficiency?: 0 | 1 | 2 | 3 | 4;
}

export interface Opportunity {
  readonly id: OpportunityId;
  readonly ownerOrganizationId: OrganizationId;
  readonly currentVersionId: OpportunityVersionId;
  readonly status: 'draft' | 'published' | 'paused' | 'closed' | 'archived';
}

export interface OpportunityVersion extends VersionStamp {
  readonly id: OpportunityVersionId;
  readonly opportunityId: OpportunityId;
  readonly title: string;
  readonly description: string;
  readonly type: OpportunityType;
  readonly audiences: readonly OpportunityAudience[];
  readonly requirements: readonly OpportunityRequirement[];
  readonly eligibilityRules: readonly EligibilityRule[];
  readonly source: SourceReference;
  readonly publishedAt?: IsoTimestamp;
  readonly closesAt?: IsoTimestamp;
}

export function classifyUnresolvedRequirement(hasEvidence: boolean): RequirementEvidenceState {
  return hasEvidence ? 'EVIDENCE_PRESENT' : 'UNKNOWN';
}
