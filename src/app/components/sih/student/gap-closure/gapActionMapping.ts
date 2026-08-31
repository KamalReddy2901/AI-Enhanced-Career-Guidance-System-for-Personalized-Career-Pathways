import type { OpportunityRequirement, OpportunityVersion, OpportunityReadinessResult, RequirementReadinessResult } from '../../../../domain';

export type GapPlanGroupKind = 'evidence' | 'capability' | 'eligibility' | 'logistics' | 'unknown';
export type GapActionKind = 'PROVE_EXISTING' | 'PRACTICE' | 'LEARN' | 'EXPERIENCE' | 'RESOLVE_ELIGIBILITY' | 'RESOLVE_LOGISTICS';

export interface GapClosureAction {
  readonly id: string;
  readonly group: GapPlanGroupKind;
  readonly kind: GapActionKind;
  readonly requirementId?: string;
  readonly canonicalSkillId?: string;
  readonly title: string;
  readonly reason: string;
  readonly expectedEvidence: string;
}

function canonicalSkillFor(authoredRequirement?: OpportunityRequirement): string | undefined {
  if (authoredRequirement?.category !== 'skill') return undefined;
  return authoredRequirement.canonicalResolution.state === 'resolved'
    ? authoredRequirement.canonicalResolution.skillId
    : undefined;
}

function actionForRequirement(requirement: RequirementReadinessResult, authoredRequirement?: OpportunityRequirement): GapClosureAction[] {
  const base = {
    requirementId: requirement.requirementId,
    title: requirement.literalSourceWording,
  };

  if (requirement.state === 'UNKNOWN') {
    return [{ ...base, id: `${requirement.requirementId}:discover`, group: 'unknown', kind: 'PROVE_EXISTING', reason: 'Current information is insufficient to determine this requirement. Start by locating or providing relevant evidence; this is not a finding that you lack the capability.', expectedEvidence: 'A relevant, scoped evidence record or the missing information needed for review.' }];
  }
  if (requirement.state === 'MET_WEAK_EVIDENCE') {
    return [{ ...base, id: `${requirement.requirementId}:prove`, group: 'evidence', kind: 'PROVE_EXISTING', reason: 'The requirement has support, but the current evidence does not meet its stated strength or verification expectation.', expectedEvidence: requirement.evidenceExpectation }];
  }
  if (requirement.state === 'NOT_APPLICABLE' || requirement.state === 'MET_STRONG') return [];

  if (requirement.category === 'logistics') {
    return [{ ...base, id: `${requirement.requirementId}:logistics`, group: 'logistics', kind: 'RESOLVE_LOGISTICS', reason: 'This is a logistics requirement, not a skill-training recommendation.', expectedEvidence: 'Current, requirement-specific logistics information.' }];
  }
  if (requirement.category === 'document_evidence' || requirement.category === 'qualification' || requirement.category === 'questionnaire') {
    return [{ ...base, id: `${requirement.requirementId}:evidence`, group: 'evidence', kind: 'PROVE_EXISTING', reason: 'This requirement needs appropriate evidence or information rather than a new readiness calculation.', expectedEvidence: requirement.evidenceExpectation }];
  }
  if (requirement.category === 'experience') {
    return [{ ...base, id: `${requirement.requirementId}:experience`, group: 'capability', kind: 'EXPERIENCE', reason: 'The requirement calls for scoped experience. No provider or outcome is promised.', expectedEvidence: requirement.evidenceExpectation }];
  }

  const canonicalSkillId = canonicalSkillFor(authoredRequirement);
  const capabilityActions: GapClosureAction[] = [
    { ...base, id: `${requirement.requirementId}:practice`, group: 'capability', kind: 'PRACTICE', reason: 'Relevant capability is only partially established or currently not met.', expectedEvidence: 'A scoped practice record that addresses the requirement.' },
    { ...base, ...(canonicalSkillId ? { canonicalSkillId } : {}), id: `${requirement.requirementId}:learn`, group: 'capability', kind: 'LEARN', reason: canonicalSkillId ? 'Learning may help develop the stated capability. Published program discovery can be filtered by this exact human-confirmed canonical skill; CareerCase does not rank providers or promise outcomes.' : 'Learning may help develop the stated capability. Because this requirement has no authoritative canonical skill resolution, CareerCase will not guess a program filter.', expectedEvidence: 'Evidence appropriate to the requirement after learning.' },
  ];
  return requirement.state === 'PARTIAL' && requirement.supportingEvidenceIds.length > 0
    ? [{ ...base, id: `${requirement.requirementId}:prove`, group: 'evidence', kind: 'PROVE_EXISTING', reason: 'Relevant evidence exists but does not yet establish the full requirement. Strengthen or clarify that evidence first where appropriate.', expectedEvidence: requirement.evidenceExpectation }, ...capabilityActions]
    : capabilityActions;
}

export function buildGapClosureActions(result: OpportunityReadinessResult, opportunityVersion: OpportunityVersion): GapClosureAction[] {
  if (result.opportunityId !== opportunityVersion.opportunityId || result.opportunityVersionId !== opportunityVersion.id) return [];
  const authoredById = new Map(opportunityVersion.requirements.map((requirement) => [String(requirement.id), requirement]));
  const requirementActions = [...result.requiredRequirementResults, ...result.preferredRequirementResults]
    .flatMap((requirement) => actionForRequirement(requirement, authoredById.get(String(requirement.requirementId))));
  const eligibilityActions = result.eligibilityRuleResults.flatMap(rule => rule.state === 'SATISFIED'
    ? []
    : [{ id: `eligibility:${rule.ruleIndex}`, group: 'eligibility' as const, kind: 'RESOLVE_ELIGIBILITY' as const, title: rule.reason, reason: 'Eligibility requires resolution or review; it is not a skill-training recommendation.', expectedEvidence: 'Confirmed information relevant to this eligibility rule.' }]);
  return [...eligibilityActions, ...requirementActions];
}
