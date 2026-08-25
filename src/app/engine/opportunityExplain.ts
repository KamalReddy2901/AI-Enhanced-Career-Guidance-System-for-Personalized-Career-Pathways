import type { OpportunityRequirement } from '../domain/opportunity';
import type { ReadinessEvidenceSignal, RequirementState } from '../domain/readiness';

const evidenceSummary = (signals: readonly ReadinessEvidenceSignal[]) => {
  const seen = new Set<string>();
  const items = signals
    .filter(signal => {
      if (seen.has(signal.evidenceRecordId)) return false;
      seen.add(signal.evidenceRecordId);
      return true;
    })
    .map(signal => `${signal.evidenceRecordId} (${signal.provenance}, ${signal.verificationState})`);
  return items.length ? ` Relevant evidence: ${items.join('; ')}.` : '';
};

export function explainRequirementState(
  requirement: OpportunityRequirement,
  state: RequirementState,
  signals: readonly ReadinessEvidenceSignal[],
): string {
  const wording = `Requirement "${requirement.literalSourceWording}"`;
  const evidence = evidenceSummary(signals);

  if (state === 'UNKNOWN') {
    return `${wording}: No relevant evidence is currently recorded for this requirement.`;
  }
  if (state === 'MET_STRONG') {
    return `${wording}: The recorded capability meets the requirement and satisfies the ${requirement.evidenceExpectation} evidence expectation.${evidence}`;
  }
  if (state === 'MET_WEAK_EVIDENCE') {
    return `${wording}: The recorded capability appears to meet the requirement, but stronger evidence or verification is still needed for the ${requirement.evidenceExpectation} expectation.${evidence}`;
  }
  if (state === 'PARTIAL') {
    return `${wording}: Relevant positive evidence is recorded, but it does not yet establish the full stated requirement.${evidence}`;
  }
  if (state === 'GAP') {
    return `${wording}: Sufficiently direct, confirmed recorded evidence indicates the stated threshold is not currently met.${evidence}`;
  }
  return `${wording}: Confirmed scoped evidence establishes that this requirement does not apply in this context.${evidence}`;
}
