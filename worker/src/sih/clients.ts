import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SihEnv } from './types';
import { SihRouteError } from './types';

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

function requireServerConfig(env: SihEnv): { url: string; publicKey: string } {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Trusted readiness service is unavailable.');
  }
  return { url: env.SUPABASE_URL.replace(/\/$/, ''), publicKey: env.SUPABASE_ANON_KEY };
}

export function createUserContextClient(env: SihEnv, accessToken: string): SupabaseClient {
  const { url, publicKey } = requireServerConfig(env);
  return createClient(url, publicKey, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createElevatedClient(env: SihEnv): SupabaseClient {
  const { url } = requireServerConfig(env);
  const elevatedKey = env.SUPABASE_ELEVATED_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!elevatedKey) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Trusted readiness service is unavailable.');
  }
  return createClient(url, elevatedKey, clientOptions);
}
