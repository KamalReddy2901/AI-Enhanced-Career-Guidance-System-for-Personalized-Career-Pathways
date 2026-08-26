import type { OpportunityReadinessResult } from '../../../src/app/domain/readiness';

export interface SihEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_ELEVATED_KEY?: string;
  /** Explicit server-only compatibility alias for local/legacy deployments. */
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export type SihErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_ACTIVE_SIH_ACTOR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'UNCONFIRMED_OPPORTUNITY'
  | 'TRUSTED_PERSISTENCE_FAILURE';

export interface SihErrorBody {
  ok: false;
  error: { code: SihErrorCode; message: string };
}

export interface RecomputeReadinessRequest {
  opportunityVersionId: string;
}

export interface RecomputeReadinessResponse {
  ok: true;
  result: OpportunityReadinessResult;
}

export class SihRouteError extends Error {
  constructor(
    readonly code: SihErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SihRouteError';
  }
}

export interface RequestIdentity {
  accessToken: string;
  authUserId: string;
  actorId: string;
}
