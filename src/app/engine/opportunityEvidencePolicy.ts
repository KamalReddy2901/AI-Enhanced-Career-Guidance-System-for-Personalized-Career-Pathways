import type { OpportunityRequirement } from '../domain/opportunity';
import type { EvidenceProvenance } from '../domain/evidence';
import type { ReadinessEvidenceSignal } from '../domain/readiness';

export const OPPORTUNITY_READINESS_POLICY_VERSION = 'opportunity-evidence-policy-v1';

const normalizeLiteral = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('en')
  .replace(/\s+/g, ' ')
  .trim();

export function isEvidenceUsable(signal: ReadinessEvidenceSignal): boolean {
  return signal.verificationState !== 'disputed' && signal.verificationState !== 'revoked';
}

export function isSignalRelevant(
  requirement: OpportunityRequirement,
  signal: ReadinessEvidenceSignal,
): boolean {
  if (signal.requirementId) return signal.requirementId === requirement.id;

  if (requirement.category === 'skill') {
    if (requirement.canonicalResolution.state === 'resolved') {
      return signal.skillId === requirement.canonicalResolution.skillId;
    }
    const literal = requirement.canonicalResolution.literalText;
    return Boolean(signal.literalSkillLabel)
      && normalizeLiteral(signal.literalSkillLabel!) === normalizeLiteral(literal);
  }

  return requirement.category === 'other_literal'
    && Boolean(signal.literalRequirementWording)
    && normalizeLiteral(signal.literalRequirementWording!) === normalizeLiteral(requirement.literalSourceWording);
}

export function relevantEvidenceSignals(
  requirement: OpportunityRequirement,
  signals: readonly ReadinessEvidenceSignal[],
): ReadinessEvidenceSignal[] {
  return signals.filter(signal => isSignalRelevant(requirement, signal));
}

export function usableRelevantEvidenceSignals(
  requirement: OpportunityRequirement,
  signals: readonly ReadinessEvidenceSignal[],
): ReadinessEvidenceSignal[] {
  return relevantEvidenceSignals(requirement, signals).filter(isEvidenceUsable);
}

const isConfirmed = (signal: ReadinessEvidenceSignal) =>
  signal.verificationState === 'self_confirmed'
  || signal.verificationState === 'human_verified'
  || signal.verificationState === 'issuer_verified'
  || signal.verificationState === 'corrected';

const strongRecordedProvenance = new Set<EvidenceProvenance>([
  'assessed',
  'artifact_backed',
  'human_attested',
  'issuer_verified',
  'outcome_linked',
]);

const artifactCapableProvenance = new Set<EvidenceProvenance>([
  'artifact_backed',
  'assessed',
  'human_attested',
  'issuer_verified',
  'outcome_linked',
]);

/** Categorical evidence policy. Multiple weak records never aggregate into a
 * stronger provenance or verification tier. */
export function isStrongForRequirement(
  requirement: OpportunityRequirement,
  signal: ReadinessEvidenceSignal,
): boolean {
  if (!isEvidenceUsable(signal) || !isConfirmed(signal)) return false;
  if (signal.provenance === 'human_attested'
    && signal.verificationState !== 'human_verified'
    && signal.verificationState !== 'issuer_verified') return false;
  if (signal.provenance === 'issuer_verified' && signal.verificationState !== 'issuer_verified') return false;

  if (requirement.evidenceExpectation === 'human_or_issuer_expected') {
    return signal.verificationState === 'human_verified'
      || signal.verificationState === 'issuer_verified';
  }

  if (requirement.evidenceExpectation === 'artifact_expected') {
    return signal.artifactIds.length > 0 && artifactCapableProvenance.has(signal.provenance);
  }

  if (signal.provenance === 'human_attested') return signal.verificationState === 'human_verified';
  if (signal.provenance === 'issuer_verified') return signal.verificationState === 'issuer_verified';
  return strongRecordedProvenance.has(signal.provenance);
}

export function hasStrongEvidence(
  requirement: OpportunityRequirement,
  signals: readonly ReadinessEvidenceSignal[],
): boolean {
  return signals.some(signal => isStrongForRequirement(requirement, signal));
}

export function hasBoundedHumanOrIssuerVerification(signals: readonly ReadinessEvidenceSignal[]): boolean {
  return signals.some(signal => signal.verificationState === 'human_verified' || signal.verificationState === 'issuer_verified');
}
