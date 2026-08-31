import type { EvidenceRecordId } from '../domain/shared';
import type { OpportunityRequirement } from '../domain/opportunity';
import type {
  ReadinessEvidenceSignal,
  RequirementReadinessResult,
  RequirementState,
} from '../domain/readiness';
import {
  hasBoundedHumanOrIssuerVerification,
  hasStrongEvidence,
  usableRelevantEvidenceSignals,
} from './opportunityEvidencePolicy';
import { explainRequirementState } from './opportunityExplain';
import { assertOpportunityRequirementConfirmed } from './opportunityReadinessValidation';

const isConfirmed = (signal: ReadinessEvidenceSignal) =>
  signal.verificationState === 'self_confirmed'
  || signal.verificationState === 'human_verified'
  || signal.verificationState === 'issuer_verified'
  || signal.verificationState === 'corrected';

const isDirectConfirmed = (signal: ReadinessEvidenceSignal) => signal.directness === 'direct' && isConfirmed(signal);

const uniqueByEvidenceId = (signals: readonly ReadinessEvidenceSignal[]) => {
  const seen = new Set<EvidenceRecordId>();
  return signals.filter(signal => {
    if (seen.has(signal.evidenceRecordId)) return false;
    seen.add(signal.evidenceRecordId);
    return true;
  });
};

interface RequirementDecision {
  state: RequirementState;
  decisionSignals: ReadinessEvidenceSignal[];
}

function explicitDecision(signals: readonly ReadinessEvidenceSignal[]): RequirementDecision | undefined {
  const notApplicable = signals.filter(signal => signal.capabilityAssertion === 'not_applicable' && isDirectConfirmed(signal));
  if (notApplicable.length) return { state: 'NOT_APPLICABLE', decisionSignals: notApplicable };
  const confirmedGap = signals.filter(signal => signal.capabilityAssertion === 'does_not_meet' && isDirectConfirmed(signal));
  if (confirmedGap.length) return { state: 'GAP', decisionSignals: confirmedGap };
  return undefined;
}

function skillDecision(
  requirement: Extract<OpportunityRequirement, { category: 'skill' }>,
  signals: readonly ReadinessEvidenceSignal[],
): RequirementDecision {
  const explicit = explicitDecision(signals);
  if (explicit) return explicit;
  if (!signals.length) return { state: 'UNKNOWN', decisionSignals: [] };

  const partialAssertions = signals.filter(signal => signal.capabilityAssertion === 'partial');
  if (requirement.minimumProficiency === undefined) {
    const positive = signals.filter(signal => signal.capabilityAssertion === 'supports' || signal.capabilityAssertion === undefined);
    return positive.length
      ? { state: 'MET_WEAK_EVIDENCE', decisionSignals: positive }
      : { state: 'PARTIAL', decisionSignals: partialAssertions.length ? partialAssertions : [...signals] };
  }

  const withProficiency = signals.filter(signal => signal.proficiency !== undefined);
  const meeting = withProficiency.filter(signal => signal.proficiency! >= requirement.minimumProficiency!);
  if (meeting.length) return { state: 'MET_WEAK_EVIDENCE', decisionSignals: meeting };

  const below = withProficiency.filter(signal => signal.proficiency! < requirement.minimumProficiency!);
  const confirmedBelow = below.filter(isDirectConfirmed);
  if (confirmedBelow.length) return { state: 'GAP', decisionSignals: confirmedBelow };
  if (below.length || partialAssertions.length || signals.some(signal => signal.capabilityAssertion === 'supports')) {
    return { state: 'PARTIAL', decisionSignals: [...below, ...partialAssertions] };
  }
  return { state: 'PARTIAL', decisionSignals: [...signals] };
}

function experienceDecision(
  requirement: Extract<OpportunityRequirement, { category: 'experience' }>,
  signals: readonly ReadinessEvidenceSignal[],
): RequirementDecision {
  const explicit = explicitDecision(signals);
  if (explicit) return explicit;
  if (!signals.length) return { state: 'UNKNOWN', decisionSignals: [] };
  const yearsSignals = signals.filter(signal => signal.experienceYears !== undefined);
  if (requirement.minimumYears !== undefined) {
    const meeting = yearsSignals.filter(signal => signal.experienceYears! >= requirement.minimumYears!);
    if (meeting.length) return { state: 'MET_WEAK_EVIDENCE', decisionSignals: meeting };
    const below = yearsSignals.filter(signal => signal.experienceYears! < requirement.minimumYears!);
    const confirmedBelow = below.filter(isDirectConfirmed);
    if (confirmedBelow.length) return { state: 'GAP', decisionSignals: confirmedBelow };
    if (below.length || signals.some(signal => signal.capabilityAssertion === 'supports' || signal.capabilityAssertion === 'partial')) {
      return { state: 'PARTIAL', decisionSignals: below.length ? below : [...signals] };
    }
    return { state: 'UNKNOWN', decisionSignals: [] };
  }
  const positive = signals.filter(signal => signal.capabilityAssertion === 'supports' || signal.capabilityAssertion === undefined);
  if (positive.length) return { state: 'MET_WEAK_EVIDENCE', decisionSignals: positive };
  return signals.some(signal => signal.capabilityAssertion === 'partial')
    ? { state: 'PARTIAL', decisionSignals: [...signals] }
    : { state: 'UNKNOWN', decisionSignals: [] };
}

function nonSkillDecision(
  requirement: Exclude<OpportunityRequirement, { category: 'skill' | 'experience' }>,
  signals: readonly ReadinessEvidenceSignal[],
): RequirementDecision {
  const explicit = explicitDecision(signals);
  if (explicit) return explicit;
  if (!signals.length) return { state: 'UNKNOWN', decisionSignals: [] };

  if (requirement.category === 'document_evidence') {
    const withArtifact = signals.filter(signal => signal.artifactIds.length > 0);
    if (withArtifact.length) return { state: 'MET_WEAK_EVIDENCE', decisionSignals: withArtifact };
    return signals.some(signal => signal.capabilityAssertion === 'supports' || signal.capabilityAssertion === 'partial')
      ? { state: 'PARTIAL', decisionSignals: [...signals] }
      : { state: 'UNKNOWN', decisionSignals: [] };
  }

  if (requirement.category === 'questionnaire') {
    const completed = signals.filter(signal => signal.capabilityAssertion === 'supports');
    return completed.length
      ? { state: 'MET_WEAK_EVIDENCE', decisionSignals: completed }
      : { state: 'UNKNOWN', decisionSignals: [] };
  }

  const positive = signals.filter(signal => signal.capabilityAssertion === 'supports' || signal.capabilityAssertion === undefined);
  if (positive.length) return { state: 'MET_WEAK_EVIDENCE', decisionSignals: positive };
  if (signals.some(signal => signal.capabilityAssertion === 'partial')) {
    return { state: 'PARTIAL', decisionSignals: [...signals] };
  }
  return { state: 'UNKNOWN', decisionSignals: [] };
}

export function evaluateOpportunityRequirement(
  requirement: OpportunityRequirement,
  evidenceSignals: readonly ReadinessEvidenceSignal[],
): RequirementReadinessResult {
  assertOpportunityRequirementConfirmed(requirement);
  const relevant = usableRelevantEvidenceSignals(requirement, evidenceSignals);
  const initialDecision = requirement.category === 'skill'
    ? skillDecision(requirement, relevant)
    : requirement.category === 'experience'
      ? experienceDecision(requirement, relevant)
      : nonSkillDecision(requirement, relevant);
  const decisionSignals = uniqueByEvidenceId(initialDecision.decisionSignals);
  const state = initialDecision.state === 'MET_WEAK_EVIDENCE' && hasStrongEvidence(requirement, decisionSignals)
    ? 'MET_STRONG'
    : initialDecision.state;

  return {
    requirementId: requirement.id,
    category: requirement.category,
    priority: requirement.priority,
    literalSourceWording: requirement.literalSourceWording,
    importance: requirement.importance,
    evidenceExpectation: requirement.evidenceExpectation,
    humanConfirmed: requirement.humanConfirmed,
    hardGate: requirement.hardGate,
    state,
    supportingEvidenceIds: decisionSignals.map(signal => signal.evidenceRecordId),
    supportingProvenance: [...new Set(decisionSignals.map(signal => signal.provenance))],
    explanation: explainRequirementState(requirement, state, decisionSignals),
    verificationSupported: hasBoundedHumanOrIssuerVerification(relevant),
  };
}
