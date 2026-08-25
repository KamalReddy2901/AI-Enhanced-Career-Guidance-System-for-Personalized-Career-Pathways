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
export type RequirementImportance = 1 | 2 | 3;
export type RequirementEvidenceExpectation =
  | 'any_recorded'
  | 'artifact_expected'
  | 'human_or_issuer_expected';

export type EligibilityEducationLevel =
  | 'below_10'
  | 'class_10'
  | 'class_12'
  | 'iti_diploma'
  | 'undergraduate'
  | 'postgraduate';

export type EligibilityRule =
  | { readonly kind: 'education_level'; readonly operator: 'at_least' | 'equals'; readonly value: EligibilityEducationLevel }
  | { readonly kind: 'graduation_year'; readonly operator: 'before' | 'after'; readonly value: number }
  | { readonly kind: 'graduation_year'; readonly operator: 'between'; readonly value: readonly [number, number] }
  | { readonly kind: 'location'; readonly operator: 'in' | 'not_in'; readonly values: readonly string[]; readonly requiresPhysicalPresence: true }
  | { readonly kind: 'organization_membership'; readonly organizationIds: readonly OrganizationId[] }
  | { readonly kind: 'availability'; readonly factKey: string; readonly expectedValue: string | boolean }
  | { readonly kind: 'licence_registration'; readonly licenceCode: string; readonly expectedValue: string | boolean }
  | { readonly kind: 'work_authorization'; readonly jurisdiction: string }
  | { readonly kind: 'language'; readonly language: string }
  | { readonly kind: 'explicit_prerequisite'; readonly factKey: string; readonly expectedValue: string | boolean }
  | { readonly kind: 'custom'; readonly literalSourceWording: string; readonly machineEnforced: false };

interface OpportunityRequirementBase {
  readonly id: OpportunityRequirementId;
  readonly priority: RequirementPriority;
  readonly literalSourceWording: string;
  readonly importance: RequirementImportance;
  readonly evidenceExpectation: RequirementEvidenceExpectation;
  readonly humanConfirmed: boolean;
  readonly hardGate: boolean;
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
