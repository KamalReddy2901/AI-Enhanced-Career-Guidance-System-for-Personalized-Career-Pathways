import type { EvidenceScope, ReadinessEvidenceSignal, VerificationEvent, VerificationState } from '../domain';
import type { DemoEvidenceLedgerEntry } from './demoTypes';

function sameScope(left: EvidenceScope, right: EvidenceScope): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'opportunity' && right.kind === 'opportunity') {
    return left.opportunityId === right.opportunityId && left.requirementId === right.requirementId;
  }
  if (left.kind === 'global_skill' && right.kind === 'global_skill') {
    return left.skillId === right.skillId && left.literalSkillLabel === right.literalSkillLabel;
  }
  if (left.kind === 'organization' && right.kind === 'organization') {
    return left.organizationId === right.organizationId;
  }
  return left.kind === 'outcome'
    && right.kind === 'outcome'
    && left.outcomeEventId === right.outcomeEventId;
}

function verificationStateAfter(
  initial: VerificationState,
  entry: DemoEvidenceLedgerEntry,
  verificationEvents: readonly VerificationEvent[],
): VerificationState {
  return verificationEvents
    .filter(event => event.evidenceRecordId === entry.record.id && sameScope(event.scope, entry.record.scope))
    .reduce<VerificationState>((state, event) => {
      if (event.action === 'verified_by_human') return 'human_verified';
      if (event.action === 'verified_by_issuer') return 'issuer_verified';
      if (event.action === 'disputed') return 'disputed';
      if (event.action === 'revoked') return 'revoked';
      if (event.action === 'corrected') return 'corrected';
      if (event.action === 'self_confirmed') return 'self_confirmed';
      return state;
    }, initial);
}

/** Projects append-only demo evidence and verification history into the narrow
 * normalized signals accepted by Engine B. Evidence provenance is copied
 * unchanged; verification is derived independently from scoped events. */
export function projectDemoEvidenceSignals(
  ledger: readonly DemoEvidenceLedgerEntry[],
  verificationEvents: readonly VerificationEvent[],
): ReadinessEvidenceSignal[] {
  return ledger.map(entry => {
    const scope = entry.record.scope;
    const requirementId = scope.kind === 'opportunity' ? scope.requirementId : undefined;
    const skillId = scope.kind === 'global_skill' ? scope.skillId : undefined;
    const literalSkillLabel = scope.kind === 'global_skill' ? scope.literalSkillLabel : undefined;
    return {
      evidenceRecordId: entry.record.id,
      requirementId,
      skillId,
      literalSkillLabel,
      literalRequirementWording: scope.kind === 'opportunity' ? entry.record.literalClaim : undefined,
      proficiency: entry.readiness.proficiency,
      experienceYears: entry.readiness.experienceYears,
      capabilityAssertion: entry.readiness.capabilityAssertion,
      provenance: entry.record.provenance,
      verificationState: verificationStateAfter(entry.record.verificationState, entry, verificationEvents),
      artifactIds: entry.record.artifacts.map(artifact => artifact.id),
      workSampleArtifactIds: entry.readiness.workSampleArtifactIds,
      observedAt: entry.record.createdAt,
      directness: entry.readiness.directness,
    };
  });
}
