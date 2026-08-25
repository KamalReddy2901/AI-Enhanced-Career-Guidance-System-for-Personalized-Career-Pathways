import type {
  ActorId,
  EvidenceArtifactId,
  EvidenceRecordId,
  IsoTimestamp,
  OpportunityId,
  OpportunityReadinessResultId,
  OpportunityRequirementId,
  OpportunityVersionId,
  OrganizationId,
} from './shared';
import type {
  EligibilityEducationLevel,
  EligibilityRule,
  OpportunityRequirement,
  RequirementPriority,
} from './opportunity';
import type { EvidenceProvenance, VerificationState } from './evidence';

export const ELIGIBILITY_STATUSES = [
  'ELIGIBLE',
  'NEEDS_REVIEW',
  'NOT_CURRENTLY_ELIGIBLE',
] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const REQUIREMENT_STATES = [
  'MET_STRONG',
  'MET_WEAK_EVIDENCE',
  'PARTIAL',
  'UNKNOWN',
  'GAP',
  'NOT_APPLICABLE',
] as const;
export type RequirementState = (typeof REQUIREMENT_STATES)[number];

export const READINESS_BANDS = [
  'NOT_ELIGIBLE',
  'NEEDS_REVIEW',
  'BUILDING_EVIDENCE',
  'NEAR_READY',
  'READY_FOR_REVIEW',
] as const;
export type ReadinessBand = (typeof READINESS_BANDS)[number];

export type LearningDistance = 'none' | 'short' | 'medium' | 'long' | 'unknown';
export type EvidenceDirectness = 'direct' | 'explicit_claim' | 'indirect';
export type CapabilityAssertion = 'supports' | 'partial' | 'does_not_meet' | 'not_applicable';

/** A deterministic projection for readiness evaluation. It never infers
 * proficiency from provenance; the producer must supply capability explicitly. */
export interface ReadinessEvidenceSignal {
  readonly evidenceRecordId: EvidenceRecordId;
  readonly requirementId?: OpportunityRequirementId;
  readonly skillId?: string;
  readonly literalSkillLabel?: string;
  readonly literalRequirementWording?: string;
  readonly proficiency?: 0 | 1 | 2 | 3 | 4;
  readonly experienceYears?: number;
  readonly capabilityAssertion?: CapabilityAssertion;
  readonly provenance: EvidenceProvenance;
  readonly verificationState: VerificationState;
  readonly artifactIds: readonly EvidenceArtifactId[];
  readonly workSampleArtifactIds: readonly EvidenceArtifactId[];
  readonly observedAt: IsoTimestamp;
  readonly directness: EvidenceDirectness;
}

export interface ConfirmedFact<Value> {
  readonly value: Value;
  readonly confirmed: boolean;
}

export interface ReadinessOrganizationMembershipFact {
  readonly organizationId: OrganizationId;
  readonly active: boolean;
  readonly confirmed: boolean;
}

export interface ReadinessNamedEligibilityFact {
  readonly kind: 'availability' | 'licence_registration' | 'explicit_prerequisite';
  readonly key: string;
  readonly value: string | boolean;
  readonly confirmed: boolean;
}

export interface ReadinessWorkAuthorizationFact {
  readonly jurisdiction: string;
  readonly authorized: boolean;
  readonly confirmed: boolean;
}

export interface ReadinessSubjectInput {
  readonly actorId: ActorId;
  readonly factsVersion: string;
  readonly educationLevel?: ConfirmedFact<EligibilityEducationLevel>;
  readonly graduationYear?: ConfirmedFact<number>;
  readonly physicalPresenceLocations: readonly ConfirmedFact<string>[];
  readonly physicalPresenceLocationsComplete: boolean;
  readonly organizationMemberships: readonly ReadinessOrganizationMembershipFact[];
  readonly organizationMembershipsComplete: boolean;
  readonly eligibilityFacts: readonly ReadinessNamedEligibilityFact[];
  readonly workAuthorizations: readonly ReadinessWorkAuthorizationFact[];
  readonly relevantLanguages: readonly ConfirmedFact<string>[];
  readonly relevantLanguagesComplete: boolean;
  readonly evidenceSignals: readonly ReadinessEvidenceSignal[];
}

export interface ReadinessOpportunityInput {
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly opportunityVersion: number;
  readonly eligibilityRules: readonly EligibilityRule[];
  readonly requirements: readonly OpportunityRequirement[];
}

export type EligibilityRuleState = 'SATISFIED' | 'NEEDS_REVIEW' | 'FAILED';

export interface EligibilityRuleResult {
  readonly ruleIndex: number;
  readonly ruleKind: EligibilityRule['kind'];
  readonly state: EligibilityRuleState;
  readonly reason: string;
}

export interface RequirementReadinessResult {
  readonly requirementId: OpportunityRequirementId;
  readonly category: OpportunityRequirement['category'];
  readonly priority: RequirementPriority;
  readonly literalSourceWording: string;
  readonly importance: OpportunityRequirement['importance'];
  readonly evidenceExpectation: OpportunityRequirement['evidenceExpectation'];
  readonly humanConfirmed: boolean;
  readonly hardGate: boolean;
  readonly state: RequirementState;
  readonly supportingEvidenceIds: readonly EvidenceRecordId[];
  readonly supportingProvenance: readonly EvidenceProvenance[];
  readonly explanation: string;
  readonly verificationSupported: boolean;
}

export interface CountCoverage {
  readonly met: number;
  readonly total: number;
}

export interface EvidenceCoverage {
  readonly strong: number;
  readonly weak: number;
  readonly unknown: number;
}

export interface VerificationCoverage {
  readonly supported: number;
  readonly total: number;
}

export interface OpportunityReadinessInput {
  readonly resultId: OpportunityReadinessResultId;
  readonly generatedAt: IsoTimestamp;
  readonly inputVersion: string;
  readonly evidenceProjectionVersion: string;
  readonly opportunity: ReadinessOpportunityInput;
  readonly subject: ReadinessSubjectInput;
}

export type OpportunityReadinessInputValidationIssueCode =
  | 'UNCONFIRMED_REQUIREMENT'
  | 'INVALID_REQUIREMENT_CONFIRMATION_TRACE'
  | 'UNCONFIRMED_ELIGIBILITY_RULE'
  | 'INVALID_ELIGIBILITY_RULE_CONFIRMATION_TRACE';

export interface OpportunityReadinessInputValidationIssue {
  readonly code: OpportunityReadinessInputValidationIssueCode;
  readonly path: string;
  readonly literalSourceWording: string;
  readonly message: string;
}

export type OpportunityReadinessInputValidationResult =
  | { readonly valid: true; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly OpportunityReadinessInputValidationIssue[] };

export interface OpportunityReadinessResult {
  readonly resultId: OpportunityReadinessResultId;
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly opportunityVersion: number;
  readonly subjectActorId: ActorId;
  readonly engineVersion: string;
  readonly policyVersion: string;
  readonly inputVersion: string;
  readonly subjectFactsVersion: string;
  readonly evidenceProjectionVersion: string;
  readonly eligibilityStatus: EligibilityStatus;
  readonly eligibilityRuleResults: readonly EligibilityRuleResult[];
  readonly requiredRequirementResults: readonly RequirementReadinessResult[];
  readonly preferredRequirementResults: readonly RequirementReadinessResult[];
  readonly requiredCoverage: CountCoverage;
  readonly evidenceCoverage: EvidenceCoverage;
  readonly verificationCoverage: VerificationCoverage;
  readonly partialCount: number;
  readonly gapCount: number;
  readonly relevantWorkSamples: number;
  readonly learningDistance: LearningDistance;
  readonly readinessBand: ReadinessBand;
  readonly generatedAt: IsoTimestamp;
}
