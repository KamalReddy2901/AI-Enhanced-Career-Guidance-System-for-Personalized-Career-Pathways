import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecomputeReadinessResponse, SihTrustedApiErrorCode } from './types';
import { SihTrustedApiError } from './types';

interface ErrorResponse {
  ok: false;
  error: { code: SihTrustedApiErrorCode; message: string };
}

export class SihTrustedApiClient {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly workerOrigin: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async recomputeReadiness(opportunityVersionId: string): Promise<RecomputeReadinessResponse['result']> {
    const { data, error } = await this.supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new SihTrustedApiError('UNAUTHENTICATED', 401, 'Sign in is required.');

    const response = await this.request(
      `${this.workerOrigin.replace(/\/$/, '')}/sih/readiness/recompute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ opportunityVersionId }),
      },
    );
    const body = await response.json().catch(() => null) as RecomputeReadinessResponse | ErrorResponse | null;
    if (!response.ok || !body || body.ok !== true) {
      const failure = body && body.ok === false ? body.error : null;
      throw new SihTrustedApiError(
        failure?.code ?? 'TRUSTED_PERSISTENCE_FAILURE',
        response.status,
        failure?.message ?? 'Trusted readiness request failed.',
      );
    }
    return body.result;
  }
}
