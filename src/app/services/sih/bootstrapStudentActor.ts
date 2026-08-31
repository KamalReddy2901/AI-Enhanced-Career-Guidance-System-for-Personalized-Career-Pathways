/**
 * Safe student actor bootstrap service
 * Calls the trusted RPC to create a CareerCase SIH actor for the authenticated user.
 * 
 * Security:
 * - Uses authenticated Supabase client (JWT in Authorization header)
 * - RPC derives auth_user_id from auth.uid() server-side
 * - Creates ONLY learner role, never trusted roles
 * - Idempotent: safe to call multiple times
 * 
 * Usage:
 * - Call after successful Supabase signup/signin
 * - Call when Career Passport onboarding completes
 * - Call from SihActorOnboarding retry handler
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ActorId = string;

export async function bootstrapStudentActor(
  supabase: SupabaseClient,
  displayName?: string
): Promise<ActorId> {
  const { data, error } = await supabase.schema('sih26044').rpc(
    'bootstrap_student_actor',
    { p_display_name: displayName || null }
  );

  if (error) {
    throw new Error(`Failed to bootstrap student actor: ${error.message}`);
  }

  if (!data || typeof data !== 'string') {
    throw new Error('Bootstrap RPC returned invalid actor ID');
  }

  return data as ActorId;
}
