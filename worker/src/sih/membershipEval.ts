/**
 * D1 membership evaluation semantics.
 *
 * This TypeScript implementation documents the evaluation contract that the
 * canonical current_readiness_organization_memberships() SECURITY DEFINER RPC
 * (migration 014) must honour.  It is used in unit tests to verify the
 * contract independently of a live database.
 *
 * The SQL RPC replaces this function in the production Worker code path, but
 * the pure-function version is retained here so that:
 *   (a) the semantics are documented in one executable place, and
 *   (b) unit tests can run without a Supabase instance.
 */

type Row = Record<string, unknown>;

export function evaluateEffectiveMemberships(
  memberships: Row[],
  generatedAt: string,
): Array<{ organizationId: string; active: boolean; confirmed: boolean }> {
  const genDate = new Date(generatedAt).getTime();
  const orgEffectiveMap = new Map<string, boolean>();

  for (const m of memberships) {
    const orgId = String(m.organization_id);
    const validFrom = m.valid_from ? new Date(String(m.valid_from)).getTime() : 0;
    const validUntil = m.valid_until
      ? new Date(String(m.valid_until)).getTime()
      : Number.POSITIVE_INFINITY;
    const mStatus = String(m.status);
    const orgStatus = m.organizations
      ? String((m.organizations as Record<string, unknown>).status)
      : m.organization
        ? String((m.organization as Record<string, unknown>).status)
        : 'active';

    const isEffectiveActive =
      mStatus === 'active' &&
      validFrom <= genDate &&
      validUntil > genDate &&
      orgStatus === 'active';

    const current = orgEffectiveMap.get(orgId) ?? false;
    orgEffectiveMap.set(orgId, current || isEffectiveActive);
  }

  return Array.from(orgEffectiveMap.entries())
    .map(([organizationId, active]) => ({
      organizationId,
      active,
      confirmed: true as const,
    }))
    .sort((left, right) => left.organizationId.localeCompare(right.organizationId));
}
