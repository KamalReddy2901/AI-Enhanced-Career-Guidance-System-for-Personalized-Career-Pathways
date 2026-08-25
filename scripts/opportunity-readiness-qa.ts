import assert from 'node:assert/strict';
import type {
  ActorId,
  EvidenceArtifactId,
  EvidenceRecordId,
  IsoTimestamp,
  OpportunityId,
  OpportunityReadinessInput,
  OpportunityReadinessResultId,
  OpportunityRequirementId,
  OpportunityVersionId,
  OrganizationId,
  ReadinessEvidenceSignal,
  ReadinessSubjectInput,
  RequirementReadinessResult,
  RequirementState,
  SkillOpportunityRequirement,
  ExperienceOpportunityRequirement,
  QualificationOpportunityRequirement,
  DocumentEvidenceOpportunityRequirement,
  QuestionnaireOpportunityRequirement,
  LogisticsOpportunityRequirement,
  LiteralOpportunityRequirement,
} from '../src/app/domain';
import {
  OPPORTUNITY_READINESS_ENGINE_VERSION,
  computeOpportunityReadiness,
  determineReadinessBand,
} from '../src/app/engine/opportunityReadiness';
import { OPPORTUNITY_READINESS_POLICY_VERSION } from '../src/app/engine/opportunityEvidencePolicy';
import { evaluateOpportunityRequirement } from '../src/app/engine/opportunityRequirementReadiness';
import { suggestSkillResolutions } from '../src/app/domain/skillResolver';

const at = '2026-08-25T00:00:00.000Z' as IsoTimestamp;
const requirementId = (value: string) => value as OpportunityRequirementId;
const evidenceId = (value: string) => value as EvidenceRecordId;
const artifactId = (value: string) => value as EvidenceArtifactId;

const requirementBase = {
  priority: 'required' as const,
  importance: 3 as const,
  evidenceExpectation: 'any_recorded' as const,
  humanConfirmed: true,
  hardGate: false,
};

const skillRequirement = (
  overrides: Partial<SkillOpportunityRequirement> = {},
): SkillOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-skill'),
  category: 'skill',
  literalSourceWording: 'Pottery & Ceramics at level 3',
  canonicalResolution: { state: 'resolved', skillId: 'pottery', matchKind: 'exact' },
  minimumProficiency: 3,
  ...overrides,
});

const experienceRequirement = (
  overrides: Partial<ExperienceOpportunityRequirement> = {},
): ExperienceOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-experience'),
  category: 'experience',
  literalSourceWording: 'Two years of directly relevant studio experience',
  minimumYears: 2,
  ...overrides,
});

const qualificationRequirement = (
  overrides: Partial<QualificationOpportunityRequirement> = {},
): QualificationOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-qualification'),
  category: 'qualification',
  literalSourceWording: 'Relevant safety qualification',
  ...overrides,
});

const documentRequirement = (
  overrides: Partial<DocumentEvidenceOpportunityRequirement> = {},
): DocumentEvidenceOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-document'),
  category: 'document_evidence',
  literalSourceWording: 'Attach an inspectable work sample',
  evidenceExpectation: 'artifact_expected',
  requestedArtifactKind: 'work_sample',
  ...overrides,
});

const questionnaireRequirement = (
  overrides: Partial<QuestionnaireOpportunityRequirement> = {},
): QuestionnaireOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-questionnaire'),
  category: 'questionnaire',
  literalSourceWording: 'Complete the safety questionnaire',
  ...overrides,
});

const logisticsRequirement = (
  overrides: Partial<LogisticsOpportunityRequirement> = {},
): LogisticsOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-logistics'),
  category: 'logistics',
  literalSourceWording: 'Available for the mandatory studio shift',
  logisticsKind: 'schedule',
  ...overrides,
});

const literalRequirement = (
  overrides: Partial<LiteralOpportunityRequirement> = {},
): LiteralOpportunityRequirement => ({
  ...requirementBase,
  id: requirementId('req-literal'),
  category: 'other_literal',
  literalSourceWording: 'Prior participation in the named community kiln programme',
  ...overrides,
});

const signal = (overrides: Partial<ReadinessEvidenceSignal> = {}): ReadinessEvidenceSignal => ({
  evidenceRecordId: evidenceId('evidence-default'),
  requirementId: requirementId('req-skill'),
  skillId: 'pottery',
  proficiency: 3,
  capabilityAssertion: 'supports',
  provenance: 'self_reported',
  verificationState: 'self_confirmed',
  artifactIds: [],
  workSampleArtifactIds: [],
  observedAt: at,
  directness: 'explicit_claim',
  ...overrides,
});

const subject = (overrides: Partial<ReadinessSubjectInput> = {}): ReadinessSubjectInput => ({
  actorId: 'actor-student' as ActorId,
  factsVersion: 'subject-facts-v1',
  educationLevel: { value: 'undergraduate', confirmed: true },
  graduationYear: { value: 2026, confirmed: true },
  physicalPresenceLocations: [{ value: 'Hyderabad', confirmed: true }],
  physicalPresenceLocationsComplete: true,
  organizationMemberships: [],
  organizationMembershipsComplete: true,
  eligibilityFacts: [],
  workAuthorizations: [],
  relevantLanguages: [{ value: 'English', confirmed: true }],
  relevantLanguagesComplete: true,
  evidenceSignals: [],
  ...overrides,
});

const readinessInput = (
  requirements: OpportunityReadinessInput['opportunity']['requirements'],
  evidenceSignals: readonly ReadinessEvidenceSignal[],
  overrides: Partial<OpportunityReadinessInput> = {},
): OpportunityReadinessInput => ({
  resultId: 'readiness-result' as OpportunityReadinessResultId,
  generatedAt: at,
  inputVersion: 'readiness-input-v1',
  evidenceProjectionVersion: 'evidence-projection-v1',
  opportunity: {
    opportunityId: 'opportunity-1' as OpportunityId,
    opportunityVersionId: 'opportunity-version-1' as OpportunityVersionId,
    opportunityVersion: 1,
    eligibilityRules: [],
    requirements,
  },
  subject: subject({ evidenceSignals }),
  ...overrides,
});

const stateOnly = (state: RequirementState): RequirementReadinessResult => ({ state } as RequirementReadinessResult);

// Normative state distinction and exact canonical/literal matching.
assert.notEqual('UNKNOWN', 'GAP');
const canonical = skillRequirement();
assert.equal(evaluateOpportunityRequirement(canonical, []).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(canonical, [signal()]).state, 'MET_WEAK_EVIDENCE');
const unresolved = skillRequirement({
  id: requirementId('req-quantum'),
  literalSourceWording: 'Quantum Ceramics',
  canonicalResolution: { state: 'unresolved', literalText: 'Quantum Ceramics' },
  minimumProficiency: undefined,
});
assert.equal(evaluateOpportunityRequirement(unresolved, []).state, 'UNKNOWN');
assert.equal(suggestSkillResolutions('Quantum Ceramics').some(item => item.skillId === 'pottery'), true,
  'the resolver may expose pottery only as a review suggestion');
assert.equal(evaluateOpportunityRequirement(unresolved, [signal({
  evidenceRecordId: evidenceId('evidence-pottery-fuzzy'),
  requirementId: undefined,
  skillId: 'pottery',
  literalSkillLabel: 'Pottery & Ceramics',
  proficiency: undefined,
})]).state, 'UNKNOWN', 'fuzzy/token similarity must never generate a MET state');
assert.equal(evaluateOpportunityRequirement(unresolved, [signal({
  evidenceRecordId: evidenceId('evidence-quantum-literal'),
  requirementId: undefined,
  skillId: undefined,
  literalSkillLabel: ' quantum   ceramics ',
  proficiency: undefined,
})]).state, 'MET_WEAK_EVIDENCE');

// Proficiency: absence is unknown, unconfirmed threshold shortfall is partial,
// and only sufficiently direct confirmed evidence establishes a gap.
assert.equal(evaluateOpportunityRequirement(canonical, [signal({ proficiency: undefined })]).state, 'PARTIAL');
assert.equal(evaluateOpportunityRequirement(canonical, [signal({ proficiency: 2 })]).state, 'PARTIAL');
assert.equal(evaluateOpportunityRequirement(canonical, [signal({
  proficiency: 2,
  provenance: 'assessed',
  verificationState: 'human_verified',
  directness: 'direct',
})]).state, 'GAP');

// Evidence expectation policy and categorical non-compounding.
const repeatedWeak = Array.from({ length: 20 }, (_, index) => signal({
  evidenceRecordId: evidenceId(`weak-${index}`),
}));
assert.equal(evaluateOpportunityRequirement(canonical, repeatedWeak).state, 'MET_WEAK_EVIDENCE');
assert.equal(evaluateOpportunityRequirement(canonical, [signal({ provenance: 'assessed' })]).state, 'MET_STRONG');
const artifactRequirement = documentRequirement();
assert.equal(evaluateOpportunityRequirement(artifactRequirement, [signal({
  evidenceRecordId: evidenceId('artifact-missing'),
  requirementId: artifactRequirement.id,
  skillId: undefined,
  proficiency: undefined,
  provenance: 'artifact_backed',
  artifactIds: [],
})]).state, 'PARTIAL');
assert.equal(evaluateOpportunityRequirement(artifactRequirement, [signal({
  evidenceRecordId: evidenceId('artifact-present'),
  requirementId: artifactRequirement.id,
  skillId: undefined,
  proficiency: undefined,
  provenance: 'artifact_backed',
  artifactIds: [artifactId('artifact-work')],
  workSampleArtifactIds: [artifactId('artifact-work')],
})]).state, 'MET_STRONG');
assert.equal(evaluateOpportunityRequirement(artifactRequirement, [signal({
  evidenceRecordId: evidenceId('artifact-unreviewed'),
  requirementId: artifactRequirement.id,
  skillId: undefined,
  proficiency: undefined,
  provenance: 'artifact_backed',
  verificationState: 'unverified',
  artifactIds: [artifactId('artifact-unreviewed')],
})]).state, 'MET_WEAK_EVIDENCE', 'an inspectable artifact may remain unreviewed');
const humanExpected = skillRequirement({ evidenceExpectation: 'human_or_issuer_expected' });
assert.equal(evaluateOpportunityRequirement(humanExpected, repeatedWeak).state, 'MET_WEAK_EVIDENCE');
assert.equal(evaluateOpportunityRequirement(humanExpected, [signal({
  provenance: 'human_attested',
  verificationState: 'self_confirmed',
})]).state, 'MET_WEAK_EVIDENCE', 'self-confirmation cannot validate human-attested provenance');
assert.equal(evaluateOpportunityRequirement(humanExpected, [signal({
  provenance: 'human_attested',
  verificationState: 'human_verified',
  directness: 'direct',
})]).state, 'MET_STRONG');
assert.equal(evaluateOpportunityRequirement(canonical, [signal({ verificationState: 'disputed' })]).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(canonical, [signal({ verificationState: 'revoked' })]).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(canonical, [signal({
  capabilityAssertion: 'not_applicable',
  directness: 'direct',
})]).state, 'NOT_APPLICABLE');

// Conservative non-skill behavior.
const experience = experienceRequirement();
assert.equal(evaluateOpportunityRequirement(experience, []).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(experience, [signal({
  requirementId: experience.id,
  skillId: undefined,
  proficiency: undefined,
  experienceYears: 1,
})]).state, 'PARTIAL');
assert.equal(evaluateOpportunityRequirement(experience, [signal({
  requirementId: experience.id,
  skillId: undefined,
  proficiency: undefined,
  experienceYears: 1,
  provenance: 'human_attested',
  verificationState: 'human_verified',
  directness: 'direct',
})]).state, 'GAP');
const qualification = qualificationRequirement();
assert.equal(evaluateOpportunityRequirement(qualification, [signal({
  requirementId: qualification.id,
  skillId: undefined,
  proficiency: undefined,
  provenance: 'issuer_verified',
  verificationState: 'unverified',
})]).state, 'MET_WEAK_EVIDENCE');
const questionnaire = questionnaireRequirement();
assert.equal(evaluateOpportunityRequirement(questionnaire, []).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(questionnaire, [signal({
  requirementId: questionnaire.id,
  skillId: undefined,
  proficiency: undefined,
  capabilityAssertion: 'partial',
})]).state, 'UNKNOWN', 'an incomplete questionnaire remains unknown');
assert.equal(evaluateOpportunityRequirement(questionnaire, [signal({
  requirementId: questionnaire.id,
  skillId: undefined,
  proficiency: undefined,
})]).state, 'MET_WEAK_EVIDENCE');
const logistics = logisticsRequirement();
assert.equal(evaluateOpportunityRequirement(logistics, []).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(logistics, [signal({
  requirementId: logistics.id,
  skillId: undefined,
  proficiency: undefined,
  capabilityAssertion: 'does_not_meet',
  directness: 'direct',
})]).state, 'GAP');
const literal = literalRequirement();
assert.equal(evaluateOpportunityRequirement(literal, []).state, 'UNKNOWN');
assert.equal(evaluateOpportunityRequirement(literal, [signal({
  requirementId: undefined,
  skillId: undefined,
  proficiency: undefined,
  literalRequirementWording: ' prior participation in the named community kiln programme ',
})]).state, 'MET_WEAK_EVIDENCE');
assert.equal(evaluateOpportunityRequirement(literal, [signal({
  requirementId: undefined,
  skillId: undefined,
  proficiency: undefined,
  literalRequirementWording: 'Participation in another programme',
})]).state, 'UNKNOWN');

// Eligibility is an uncompensated independent gate.
const hardEligibilityFailure = computeOpportunityReadiness({
  ...readinessInput([canonical], [signal()]),
  opportunity: {
    ...readinessInput([canonical], [signal()]).opportunity,
    eligibilityRules: [{ kind: 'education_level', operator: 'at_least', value: 'postgraduate' }],
  },
});
assert.equal(hardEligibilityFailure.eligibilityStatus, 'NOT_CURRENTLY_ELIGIBLE');
assert.equal(hardEligibilityFailure.readinessBand, 'NOT_ELIGIBLE');
const unknownEligibilityInput = readinessInput([canonical], [signal()]);
const unknownEligibility = computeOpportunityReadiness({
  ...unknownEligibilityInput,
  opportunity: {
    ...unknownEligibilityInput.opportunity,
    eligibilityRules: [{ kind: 'education_level', operator: 'at_least', value: 'undergraduate' }],
  },
  subject: subject({ educationLevel: undefined, evidenceSignals: [signal()] }),
});
assert.equal(unknownEligibility.eligibilityStatus, 'NEEDS_REVIEW');
assert.equal(unknownEligibility.readinessBand, 'NEEDS_REVIEW');
const customEligibilityInput = readinessInput([canonical], [signal()]);
const customEligibility = computeOpportunityReadiness({
  ...customEligibilityInput,
  opportunity: {
    ...customEligibilityInput.opportunity,
    eligibilityRules: [{ kind: 'custom', literalSourceWording: 'Portfolio reviewed by department', machineEnforced: false }],
  },
});
assert.equal(customEligibility.eligibilityStatus, 'NEEDS_REVIEW');
const physicalLocationInput = readinessInput([canonical], [signal()]);
const physicalLocationFailure = computeOpportunityReadiness({
  ...physicalLocationInput,
  opportunity: {
    ...physicalLocationInput.opportunity,
    eligibilityRules: [{
      kind: 'location',
      operator: 'in',
      values: ['Bengaluru'],
      requiresPhysicalPresence: true,
    }],
  },
});
assert.equal(physicalLocationFailure.eligibilityStatus, 'NOT_CURRENTLY_ELIGIBLE');
assert.equal(physicalLocationFailure.readinessBand, 'NOT_ELIGIBLE',
  'mandatory physical presence is an uncompensated gate, not a graded contribution');

// Exact state machine and preferred isolation.
assert.equal(determineReadinessBand('NOT_CURRENTLY_ELIGIBLE', []), 'NOT_ELIGIBLE');
assert.equal(determineReadinessBand('NEEDS_REVIEW', []), 'NEEDS_REVIEW');
assert.equal(determineReadinessBand('ELIGIBLE', [stateOnly('GAP')]), 'BUILDING_EVIDENCE');
assert.equal(determineReadinessBand('ELIGIBLE', [stateOnly('PARTIAL')]), 'BUILDING_EVIDENCE');
assert.equal(determineReadinessBand('ELIGIBLE', [stateOnly('MET_WEAK_EVIDENCE'), stateOnly('UNKNOWN')]), 'BUILDING_EVIDENCE');
assert.equal(determineReadinessBand('ELIGIBLE', [stateOnly('UNKNOWN')]), 'NEAR_READY');
assert.equal(determineReadinessBand('ELIGIBLE', [stateOnly('MET_STRONG')]), 'READY_FOR_REVIEW');
const preferredGap = experienceRequirement({
  id: requirementId('preferred-gap'),
  priority: 'preferred',
});
const preferredIsolation = computeOpportunityReadiness(readinessInput(
  [canonical, preferredGap],
  [
    signal({ provenance: 'assessed' }),
    signal({
      evidenceRecordId: evidenceId('preferred-gap-evidence'),
      requirementId: preferredGap.id,
      skillId: undefined,
      proficiency: undefined,
      experienceYears: 0,
      provenance: 'assessed',
      verificationState: 'human_verified',
      directness: 'direct',
    }),
  ],
));
assert.equal(preferredIsolation.preferredRequirementResults[0].state, 'GAP');
assert.equal(preferredIsolation.readinessBand, 'READY_FOR_REVIEW');
assert.equal(preferredIsolation.requiredCoverage.met, 1);

// Designed flagship transition: one bounded mentor attestation changes only one
// required requirement, one verification count, and the readiness band.
const mentorRequirement = skillRequirement({
  id: requirementId('req-mentor-attestation'),
  literalSourceWording: 'Demonstrate supervised kiln operation at level 3',
  evidenceExpectation: 'human_or_issuer_expected',
});
const otherStrongRequirement = skillRequirement({
  id: requirementId('req-other-strong'),
  literalSourceWording: 'Pottery quality assessment at level 3',
});
const baseSignals = [
  signal({
    evidenceRecordId: evidenceId('self-kiln-claim'),
    requirementId: mentorRequirement.id,
  }),
  signal({
    evidenceRecordId: evidenceId('assessment-other'),
    requirementId: otherStrongRequirement.id,
    provenance: 'assessed',
    workSampleArtifactIds: [artifactId('shared-work-sample')],
    artifactIds: [artifactId('shared-work-sample')],
  }),
];
const before = computeOpportunityReadiness(readinessInput(
  [mentorRequirement, otherStrongRequirement],
  baseSignals,
  { resultId: 'before-result' as OpportunityReadinessResultId },
));
assert.equal(before.eligibilityStatus, 'ELIGIBLE');
assert.deepEqual(before.requiredRequirementResults.map(result => result.state), ['MET_WEAK_EVIDENCE', 'MET_STRONG']);
assert.equal(before.readinessBand, 'NEAR_READY');
const mentorAttestation = signal({
  evidenceRecordId: evidenceId('mentor-attestation'),
  requirementId: mentorRequirement.id,
  provenance: 'human_attested',
  verificationState: 'human_verified',
  directness: 'direct',
  artifactIds: [artifactId('shared-work-sample')],
  workSampleArtifactIds: [artifactId('shared-work-sample')],
});
const after = computeOpportunityReadiness(readinessInput(
  [mentorRequirement, otherStrongRequirement],
  [...baseSignals, mentorAttestation],
  { resultId: 'after-result' as OpportunityReadinessResultId },
));
assert.deepEqual(after.requiredRequirementResults.map(result => result.state), ['MET_STRONG', 'MET_STRONG']);
assert.equal(after.verificationCoverage.supported, before.verificationCoverage.supported + 1);
assert.equal(after.readinessBand, 'READY_FOR_REVIEW');
assert.deepEqual(after.requiredRequirementResults[1], before.requiredRequirementResults[1],
  'unrelated requirement result must remain byte-for-byte equivalent');
assert.equal(before.learningDistance, 'short');
assert.equal(after.learningDistance, 'none');
assert.equal(after.relevantWorkSamples, 1);
assert.match(after.requiredRequirementResults[0].explanation, /mentor-attestation \(human_attested, human_verified\)/);

// Pure, reproducible output and prohibited pseudo-precision.
assert.deepEqual(computeOpportunityReadiness(readinessInput([canonical], [signal()])),
  computeOpportunityReadiness(readinessInput([canonical], [signal()])));
assert.equal(after.engineVersion, OPPORTUNITY_READINESS_ENGINE_VERSION);
assert.equal(after.policyVersion, OPPORTUNITY_READINESS_POLICY_VERSION);
for (const prohibited of ['readinessPercentage', 'fitPercentage', 'hiringProbability', 'successProbability', 'candidateQualityScore', 'employabilityScore', 'rankingScore']) {
  assert.equal(prohibited in after, false, `${prohibited} must not exist in the canonical result`);
}

console.log(JSON.stringify({
  requirementStates: ['MET_STRONG', 'MET_WEAK_EVIDENCE', 'PARTIAL', 'UNKNOWN', 'GAP', 'NOT_APPLICABLE'],
  eligibilityStates: ['ELIGIBLE', 'NEEDS_REVIEW', 'NOT_CURRENTLY_ELIGIBLE'],
  flagship: {
    before: { state: before.requiredRequirementResults[0].state, verification: before.verificationCoverage, band: before.readinessBand },
    after: { state: after.requiredRequirementResults[0].state, verification: after.verificationCoverage, band: after.readinessBand },
    unrelatedRequirementUnchanged: true,
  },
  preferredIsolation: true,
  deterministic: true,
  failures: [],
}, null, 2));
