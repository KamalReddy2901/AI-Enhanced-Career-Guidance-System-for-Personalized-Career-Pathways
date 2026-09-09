import type { VerificationAction } from '../../domain/evidence';

const LEGACY_DATA_VISUALIZATION_REASON =
  'Observed Ananya independently create the visualization layer for the Sales Analytics Dashboard and explain the design choices.';

const PRESENTATION_DATA_VISUALIZATION_REASON =
  'Observed Ananya independently create the visualization layer and explain the design choices.';

export function presentationVerificationActorLabel(action: VerificationAction): string {
  switch (action) {
    case 'self_confirmed':
      return 'Recorded by learner';
    case 'verified_by_human':
      return 'Recorded by authorized faculty';
    case 'verified_by_issuer':
      return 'Recorded by authorized issuer';
    default:
      return 'Recorded in verification history';
  }
}

/** Display-only normalization for one known controlled historical record. */
export function presentationVerificationReason(
  action: VerificationAction,
  reason?: string,
): string | undefined {
  return action === 'verified_by_human' && reason === LEGACY_DATA_VISUALIZATION_REASON
    ? PRESENTATION_DATA_VISUALIZATION_REASON
    : reason;
}
