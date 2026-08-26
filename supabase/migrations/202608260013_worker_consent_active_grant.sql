-- Migration 013: Grant is_consent_active to service_role for trusted Worker path
--
-- Context: Migration 007 (security_integrity_hardening) revoked EXECUTE on
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

grant execute on function sih26044.is_consent_active(
  uuid, uuid, uuid, sih26044.consent_purpose
) to service_role;

comment on function sih26044.is_consent_active(uuid, uuid, uuid, sih26044.consent_purpose) is
  'Consent active predicate: validates granted_at, lifecycle state, expiry, subject, grantee, and purpose. '
  'Callable by SECURITY DEFINER trigger/RPCs internally, and by service_role for the trusted Worker '
  'application-snapshot path. Not callable by authenticated (browser) or anon clients directly.';
