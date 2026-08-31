import type { VerificationState } from '../../../src/app/domain/evidence';

export interface VerificationEventRow {
  readonly evidence_record_id: string;
  readonly verification_request_id: string;
  readonly sequence_number: number | string;
  readonly action: string;
  readonly occurred_at?: string;
}

export interface RequestScopedVerificationAssertion {
  readonly verificationRequestId: string;
  readonly verificationState: VerificationState;
  readonly action: string;
  readonly sequenceNumber: number;
  readonly occurredAt?: string;
}

const actionToState: Readonly<Record<string, VerificationState>> = {
  self_confirmed: 'self_confirmed',
  verified_by_human: 'human_verified',
  verified_by_issuer: 'issuer_verified',
  disputed: 'disputed',
  revoked: 'revoked',
  corrected: 'corrected',
};

/** Derive one current assertion per request. Never compare sequence numbers
 * across requests: they are only ordered within a verification request. */
export function deriveRequestScopedVerificationAssertions(
  evidenceRecordId: string,
  events: readonly VerificationEventRow[],
): RequestScopedVerificationAssertion[] {
  const latestByRequest = new Map<string, VerificationEventRow>();
  for (const event of events) {
    if (event.evidence_record_id !== evidenceRecordId || event.action === 'submitted_for_review') continue;
    if (!actionToState[event.action]) continue;
    const current = latestByRequest.get(event.verification_request_id);
    if (!current || Number(event.sequence_number) > Number(current.sequence_number)) {
      latestByRequest.set(event.verification_request_id, event);
    }
  }

  return [...latestByRequest.values()]
    .sort((left, right) => left.verification_request_id.localeCompare(right.verification_request_id))
    .map(event => ({
      verificationRequestId: event.verification_request_id,
      verificationState: actionToState[event.action],
      action: event.action,
      sequenceNumber: Number(event.sequence_number),
      ...(event.occurred_at ? { occurredAt: event.occurred_at } : {}),
    }));
}

/** Engine B currently accepts one categorical state per evidence record. This
 * reducer consumes request-scoped assertions without allowing a later event in
 * an unrelated request to overwrite another request. Negative/positive
 * disagreement is surfaced conservatively as disputed. */
export function deriveReadinessVerificationState(
  initialState: VerificationState,
  assertions: readonly RequestScopedVerificationAssertion[],
): VerificationState {
  if (!assertions.length) return initialState;
  const states = new Set(assertions.map(assertion => assertion.verificationState));
  const hasPositive = [...states].some(state =>
    state === 'self_confirmed' || state === 'human_verified'
      || state === 'issuer_verified' || state === 'corrected');
  const hasNegative = states.has('disputed') || states.has('revoked');
  if (hasPositive && hasNegative) return 'disputed';
  if (states.has('disputed')) return 'disputed';
  if (states.has('issuer_verified')) return 'issuer_verified';
  if (states.has('human_verified')) return 'human_verified';
  if (states.has('corrected')) return 'corrected';
  if (states.has('self_confirmed')) return 'self_confirmed';
  if (states.has('revoked')) return 'revoked';
  return initialState;
}
