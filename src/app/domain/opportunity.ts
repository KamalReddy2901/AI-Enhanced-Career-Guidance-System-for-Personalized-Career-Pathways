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

interface OpportunityRequirementBase {
  readonly id: OpportunityRequirementId;
  readonly priority: RequirementPriority;
  readonly literalSourceWording: string;
}

export interface SkillOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'skill';
  readonly canonicalResolution: CanonicalResolutionState;
  readonly minimumProficiency?: 0 | 1 | 2 | 3 | 4;
}

export interface ExperienceOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'experience';
  readonly minimumYears?: number;
}

export interface QualificationOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'qualification';
}

export interface DocumentEvidenceOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'document_evidence';
  readonly requestedArtifactKind?: string;
}

export interface QuestionnaireOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'questionnaire';
  readonly questionnaireReference?: string;
}

export interface LogisticsOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'logistics';
  readonly logisticsKind?: 'location' | 'schedule' | 'travel' | 'work_mode' | 'availability' | 'other';
}

export interface LiteralOpportunityRequirement extends OpportunityRequirementBase {
  readonly category: 'other_literal';
}

export type OpportunityRequirement =
  | SkillOpportunityRequirement
  | ExperienceOpportunityRequirement
  | QualificationOpportunityRequirement
  | DocumentEvidenceOpportunityRequirement
  | QuestionnaireOpportunityRequirement
  | LogisticsOpportunityRequirement
  | LiteralOpportunityRequirement;

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
