import type { SupabaseClient } from '@supabase/supabase-js';

export interface PresentationAuthoritySnapshot {
  readonly userId: string;
  readonly email?: string;
  readonly fixtureNamespace?: string;
  readonly actorId: string | null;
  readonly membershipCount: number;
  readonly roleReadSucceeded: boolean;
}

export interface IntendedPresentationIdentity {
  readonly userId: string;
  readonly email: string;
}

const DEFAULT_RETRY_DELAYS_MS = [0, 100, 250, 500, 1_000, 2_000] as const;

const pause = (milliseconds: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

export function isIntendedPresentationAuthority(
  snapshot: PresentationAuthoritySnapshot,
  expected: IntendedPresentationIdentity,
): boolean {
  return snapshot.userId === expected.userId
    && snapshot.email === expected.email
    && snapshot.fixtureNamespace === 'sih26044-controlled-v1'
    && Boolean(snapshot.actorId)
    && snapshot.roleReadSucceeded;
}

/**
 * A bounded handshake used before protected-route navigation. The probe must
 * read the shared session and its RLS-protected SIH authority; successful
 * credential validation in an isolated client is intentionally insufficient.
 */
export async function waitForPresentationAuthority(
  probe: () => Promise<PresentationAuthoritySnapshot>,
  expected: IntendedPresentationIdentity,
  retryDelaysMs: readonly number[] = DEFAULT_RETRY_DELAYS_MS,
  delay: (milliseconds: number) => Promise<void> = pause,
): Promise<PresentationAuthoritySnapshot> {
  let lastError: unknown;
  for (const retryDelay of retryDelaysMs) {
    if (retryDelay > 0) await delay(retryDelay);
    try {
      const snapshot = await probe();
      if (isIntendedPresentationAuthority(snapshot, expected)) return snapshot;
      lastError = new Error('The intended presentation authority is not ready.');
    } catch (reason) {
      lastError = reason;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('The intended presentation authority is not ready.');
}

export async function navigateWhenPresentationAuthorityIsReady(
  probe: () => Promise<PresentationAuthoritySnapshot>,
  expected: IntendedPresentationIdentity,
  navigate: () => void,
  retryDelaysMs?: readonly number[],
  delay?: (milliseconds: number) => Promise<void>,
): Promise<void> {
  await waitForPresentationAuthority(probe, expected, retryDelaysMs, delay);
  navigate();
}

export async function readPresentationAuthority(
  client: SupabaseClient,
): Promise<PresentationAuthoritySnapshot> {
  // getUser validates the shared access token with Supabase Auth instead of
  // trusting a possibly stale browser session snapshot.
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('No authenticated presentation user.');

  const db = client.schema('sih26044');
  const { data: actorData, error: actorError } = await db.rpc('current_actor_id');
  if (actorError) throw actorError;
  const actorId = typeof actorData === 'string' ? actorData : null;
  if (!actorId) throw new Error('The presentation user has no active SIH actor identity.');

  const { data: membershipRows, error: membershipError } = await db
    .from('organization_memberships')
    .select('id')
    .eq('actor_id', actorId)
    .eq('status', 'active');
  if (membershipError) throw membershipError;

  const membershipIds = (membershipRows ?? []).map((row) => row.id as string);
  const roleQuery = db.from('organization_membership_roles').select('membership_id,role');
  const { error: roleError } = membershipIds.length
    ? await roleQuery.in('membership_id', membershipIds)
    : await roleQuery.limit(1);
  if (roleError) throw roleError;

  return {
    userId: userData.user.id,
    email: userData.user.email,
    fixtureNamespace: userData.user.app_metadata.fixture_namespace as string | undefined,
    actorId,
    membershipCount: membershipIds.length,
    roleReadSucceeded: true,
  };
}
