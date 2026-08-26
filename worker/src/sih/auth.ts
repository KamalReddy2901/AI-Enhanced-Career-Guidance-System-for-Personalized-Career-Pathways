import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserContextClient } from './clients';
import type { RequestIdentity, SihEnv } from './types';
import { SihRouteError } from './types';

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9._~-]+)$/;

export function extractBearerToken(request: Request): string {
  const match = request.headers.get('Authorization')?.match(BEARER_PATTERN);
  if (!match) throw new SihRouteError('UNAUTHENTICATED', 401, 'A valid bearer session is required.');
  return match[1];
}

export async function authenticateAndResolveActor(
  request: Request,
  env: SihEnv,
): Promise<{ identity: RequestIdentity; client: SupabaseClient }> {
  const accessToken = extractBearerToken(request);
  const client = createUserContextClient(env, accessToken);
  const { data: userData, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new SihRouteError('UNAUTHENTICATED', 401, 'A valid bearer session is required.');
  }

  const { data: actorId, error: actorError } = await client
    .schema('sih26044')
    .rpc('current_actor_id');
  if (actorError) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to resolve the SIH identity.');
  }
  if (typeof actorId !== 'string' || !actorId) {
    throw new SihRouteError('NO_ACTIVE_SIH_ACTOR', 403, 'No active SIH actor is linked to this account.');
  }
  return {
    identity: { accessToken, authUserId: userData.user.id, actorId },
    client,
  };
}
