-- Migration 013: Grant is_consent_active to service_role for trusted Worker path,
-- and grant SELECT on sih26044 tables to service_role for direct Worker reads.
--
-- Context:
--
-- (1) is_consent_active privilege gap:
-- Migration 007 (security_integrity_hardening) revoked EXECUTE on
-- is_consent_active from the authenticated role to prevent direct browser
-- calls to this low-level consent predicate. However, it did not grant it to
-- service_role, and migration 012 (d2_foundation_trusted_persistence)
-- introduced a Worker code path in applications.ts that calls
-- is_consent_active via the elevated (service_role) client to verify active
-- application_review consent before constructing an application snapshot.
--
-- The function is SECURITY DEFINER and validates subject_actor_id,
-- grantee_organization_id, and purpose, so exposing it to service_role (the
-- trusted Worker identity) is correct under the narrow-RPC architecture.
-- Browser clients remain blocked because the authenticated role has no grant.
--
-- Privilege discipline: only service_role gains EXECUTE; public, anon, and
-- authenticated are not granted. This maintains the invariant that browsers
-- cannot directly call consent predicates.
--
-- (2) service_role table-SELECT gap:
-- Migration 005 granted SELECT ON ALL TABLES IN SCHEMA sih26044 to
-- authenticated only. The service_role role received schema USAGE (migration
-- 011) and function EXECUTE grants (migrations 011-013) but no table-level
-- SELECT privilege. In the disposable local Supabase (used in CI), this means
-- direct table queries from the Worker elevated client (e.g. consent_evidence
-- coverage check, actor display-name lookup, subject-facts lookup, evidence
-- and artifact reads in applications.ts) fail with PostgREST permission errors.
-- In hosted Supabase service_role bypasses RLS and has implicit read access,
-- but the explicit grant is required in the local disposable environment.
-- This grant is read-only; service_role writes only through narrow SECURITY
-- DEFINER RPCs as before.

grant execute on function sih26044.is_consent_active(
  uuid, uuid, uuid, sih26044.consent_purpose
) to service_role;

-- Read-only table access for trusted Worker direct queries.
-- service_role bypasses RLS anyway; this grant satisfies the pg privilege check
-- that PostgREST enforces even for the service_role bypass path in local mode.
grant select on all tables in schema sih26044 to service_role;

comment on function sih26044.is_consent_active(uuid, uuid, uuid, sih26044.consent_purpose) is
  'Consent active predicate: validates granted_at, lifecycle state, expiry, subject, grantee, and purpose. '
  'Callable by SECURITY DEFINER trigger/RPCs internally, and by service_role for the trusted Worker '
  'application-snapshot path. Not callable by authenticated (browser) or anon clients directly.';
