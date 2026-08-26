import type { OpportunityReadinessResult } from '../../domain/readiness';

export type SihTrustedApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_ACTIVE_SIH_ACTOR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'UNCONFIRMED_OPPORTUNITY'
  | 'TRUSTED_PERSISTENCE_FAILURE';

export interface RecomputeReadinessResponse {
  ok: true;
  result: OpportunityReadinessResult;
}

export class SihTrustedApiError extends Error {
  constructor(readonly code: SihTrustedApiErrorCode, readonly status: number, message: string) {
    super(message);
    this.name = 'SihTrustedApiError';
  }
}
