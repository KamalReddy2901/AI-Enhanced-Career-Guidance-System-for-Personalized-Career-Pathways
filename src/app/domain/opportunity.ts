import type {
  HumanConfirmationTrace,
  IsoTimestamp,
  OrganizationId,
  OpportunityId,
  OpportunityRequirementId,
  OpportunityVersionId,
  SourceReference,
  VersionStamp,
} from './shared';
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

export type EligibilityRuleDefinition =
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
  | { readonly kind: 'custom'; readonly machineEnforced: false };

/** Eligibility rules are high-impact authored structure. Literal wording and
 * human confirmation travel with every machine-readable rule. */
export type EligibilityRule = EligibilityRuleDefinition & {
  readonly literalSourceWording: string;
} & HumanConfirmationTrace;

interface OpportunityRequirementBaseFields {
  readonly id: OpportunityRequirementId;
  readonly priority: RequirementPriority;
  readonly literalSourceWording: string;
  readonly importance: RequirementImportance;
  readonly evidenceExpectation: RequirementEvidenceExpectation;
  readonly hardGate: boolean;
}

type OpportunityRequirementBase = OpportunityRequirementBaseFields & HumanConfirmationTrace;

export type SkillOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'skill';
  readonly canonicalResolution: CanonicalResolutionState;
  readonly minimumProficiency?: 0 | 1 | 2 | 3 | 4;
};

export type ExperienceOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'experience';
  readonly minimumYears?: number;
};

export type QualificationOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'qualification';
};

export type DocumentEvidenceOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'document_evidence';
  readonly requestedArtifactKind?: string;
};

export type QuestionnaireOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'questionnaire';
  readonly questionnaireReference?: string;
};

export type LogisticsOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'logistics';
  readonly logisticsKind?: 'location' | 'schedule' | 'travel' | 'work_mode' | 'availability' | 'other';
};

export type LiteralOpportunityRequirement = OpportunityRequirementBase & {
  readonly category: 'other_literal';
};

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
