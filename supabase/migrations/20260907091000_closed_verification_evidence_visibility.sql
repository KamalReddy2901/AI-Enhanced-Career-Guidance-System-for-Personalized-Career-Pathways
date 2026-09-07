-- A verifier who can still read a closed, consent-bound verification request
-- must also be able to read the exact evidence that request evaluated.
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
      and vr.status in ('requested', 'accepted', 'closed')
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

comment on function sih26044.can_verify_evidence(uuid) is
  'Narrow authorization predicate for the exact evidence covered by a requested, accepted, or closed verification request with active consent and verifier authority.';
