-- SIH26044 Foundation D1: align verifier authorization with canonical consent semantics and harden SECURITY DEFINER privileges.
--
-- Execution-gate hardening checkpoint:
-- 1. Replace duplicated consent logic in can_verify_evidence with canonical is_consent_active
-- 2. Add explicit privilege discipline to SECURITY DEFINER helpers
-- 3. Add consent-lifecycle regression test for expired consent blocking verifier access

-- Replace can_verify_evidence to use canonical consent semantics
create or replace function sih26044.can_verify_evidence(evidence_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.verification_requests vr
    join sih26044.consent_grants cg on cg.id = vr.consent_grant_id
    join sih26044.consent_evidence_records cer on cer.consent_grant_id = cg.id
      and cer.evidence_record_id = vr.evidence_record_id
    where vr.evidence_record_id = evidence_id
      and vr.status in ('requested', 'accepted')
      and (vr.expires_at is null or vr.expires_at > statement_timestamp())
      and (
        vr.requested_verifier_actor_id is null
        or vr.requested_verifier_actor_id = sih26044.current_actor_id()
      )
      and vr.requested_verifier_organization_id is not null
      and sih26044.is_consent_active(
        cg.id,
        vr.subject_actor_id,
        vr.requested_verifier_organization_id,
        'evidence_verification'
      )
      and sih26044.has_any_active_organization_role(
        vr.requested_verifier_organization_id,
        array['faculty', 'issuer_verifier']::sih26044.actor_role[]
      )
  )
$$;

comment on function sih26044.can_verify_evidence is
  'Narrow authorization predicate: may current actor read THIS evidence due to valid verification request? Uses canonical consent semantics. Returns only boolean, exposes no evidence content.';

-- Harden SECURITY DEFINER helper privileges
revoke all on function sih26044.can_verify_evidence(uuid) from public;
grant execute on function sih26044.can_verify_evidence(uuid) to authenticated;

revoke all on function sih26044.is_orphan_evidence_object(text, text) from public;
grant execute on function sih26044.is_orphan_evidence_object(text, text) to authenticated;

comment on function sih26044.is_orphan_evidence_object is
  'Narrow authorization predicate: is Storage object an orphan (not registered)? Requires bucket=career-evidence-private and actor-owned path. Returns only boolean. Explicit privilege: authenticated only.';
