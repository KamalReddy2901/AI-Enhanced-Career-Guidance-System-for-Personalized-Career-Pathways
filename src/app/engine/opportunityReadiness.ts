import type {
  EligibilityStatus,
  LearningDistance,
  OpportunityReadinessInput,
  OpportunityReadinessResult,
  ReadinessBand,
  RequirementReadinessResult,
} from '../domain/readiness';
import { evaluateEligibility } from './opportunityEligibility';
import {
  OPPORTUNITY_READINESS_POLICY_VERSION,
  isEvidenceUsable,
  isSignalRelevant,
} from './opportunityEvidencePolicy';
import { evaluateOpportunityRequirement } from './opportunityRequirementReadiness';

export const OPPORTUNITY_READINESS_ENGINE_VERSION = 'opportunity-readiness-engine-v1';

export function determineReadinessBand(
  eligibility: EligibilityStatus,
  requiredRequirementResults: readonly RequirementReadinessResult[],
): ReadinessBand {
  if (eligibility === 'NOT_CURRENTLY_ELIGIBLE') return 'NOT_ELIGIBLE';
  if (eligibility === 'NEEDS_REVIEW') return 'NEEDS_REVIEW';
  if (requiredRequirementResults.some(result => result.state === 'GAP' || result.state === 'PARTIAL')) {
    return 'BUILDING_EVIDENCE';
  }
  const unresolvedRequired = requiredRequirementResults.filter(result =>
    result.state === 'MET_WEAK_EVIDENCE' || result.state === 'UNKNOWN');
  if (unresolvedRequired.length === 0) return 'READY_FOR_REVIEW';
  if (unresolvedRequired.length === 1) return 'NEAR_READY';
  return 'BUILDING_EVIDENCE';
}

function learningDistanceFor(
  eligibility: EligibilityStatus,
  requiredResults: readonly RequirementReadinessResult[],
): LearningDistance {
  if (eligibility !== 'ELIGIBLE') return 'unknown';
  if (requiredResults.some(result => result.state === 'GAP' || result.state === 'PARTIAL' || result.state === 'UNKNOWN')) {
    return 'unknown';
  }
  if (requiredResults.some(result => result.state === 'MET_WEAK_EVIDENCE')) return 'short';
  return 'none';
}

export function computeOpportunityReadiness(input: OpportunityReadinessInput): OpportunityReadinessResult {
  const eligibility = evaluateEligibility(input.opportunity.eligibilityRules, input.subject);
  const requirementResults = input.opportunity.requirements.map(requirement =>
    evaluateOpportunityRequirement(requirement, input.subject.evidenceSignals));
  const requiredRequirementResults = requirementResults.filter(result => result.priority === 'required');
  const preferredRequirementResults = requirementResults.filter(result => result.priority === 'preferred');
  const readinessBand = determineReadinessBand(eligibility.status, requiredRequirementResults);
  const met = requiredRequirementResults.filter(result =>
    result.state === 'MET_STRONG' || result.state === 'MET_WEAK_EVIDENCE').length;
  const applicableRequired = requiredRequirementResults.filter(result => result.state !== 'NOT_APPLICABLE');

  const relevantWorkSampleIds = new Set(
    input.subject.evidenceSignals
      .filter(isEvidenceUsable)
      .filter(signal => input.opportunity.requirements.some(requirement => isSignalRelevant(requirement, signal)))
      .flatMap(signal => signal.workSampleArtifactIds),
  );

  return {
    resultId: input.resultId,
    opportunityId: input.opportunity.opportunityId,
    opportunityVersionId: input.opportunity.opportunityVersionId,
    opportunityVersion: input.opportunity.opportunityVersion,
    subjectActorId: input.subject.actorId,
    engineVersion: OPPORTUNITY_READINESS_ENGINE_VERSION,
    policyVersion: OPPORTUNITY_READINESS_POLICY_VERSION,
    inputVersion: input.inputVersion,
    subjectFactsVersion: input.subject.factsVersion,
    evidenceProjectionVersion: input.evidenceProjectionVersion,
    eligibilityStatus: eligibility.status,
    eligibilityRuleResults: eligibility.ruleResults,
    requiredRequirementResults,
    preferredRequirementResults,
    requiredCoverage: { met, total: requiredRequirementResults.length },
    evidenceCoverage: {
      strong: requiredRequirementResults.filter(result => result.state === 'MET_STRONG').length,
      weak: requiredRequirementResults.filter(result => result.state === 'MET_WEAK_EVIDENCE').length,
      unknown: requiredRequirementResults.filter(result => result.state === 'UNKNOWN').length,
    },
    verificationCoverage: {
      supported: applicableRequired.filter(result => result.verificationSupported).length,
      total: applicableRequired.length,
    },
    partialCount: requiredRequirementResults.filter(result => result.state === 'PARTIAL').length,
    gapCount: requiredRequirementResults.filter(result => result.state === 'GAP').length,
    relevantWorkSamples: relevantWorkSampleIds.size,
    learningDistance: learningDistanceFor(eligibility.status, requiredRequirementResults),
    readinessBand,
    generatedAt: input.generatedAt,
  };
}
