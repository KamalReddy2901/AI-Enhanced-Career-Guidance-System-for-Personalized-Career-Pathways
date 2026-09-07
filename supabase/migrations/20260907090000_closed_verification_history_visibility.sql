-- Keep completed verification decisions visible to the same bounded verifier.
-- All existing assignment, organization-role, expiry, consent, and evidence-link
-- checks remain authoritative; only the terminal closed state is added.
create or replace function sih26044.can_access_verification_request(requested_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select exists (
    select 1
    from sih26044.verification_requests vr
    where vr.id = requested_request_id
      and (
        vr.subject_actor_id = sih26044.current_actor_id()
        or (
          vr.status in ('requested', 'accepted', 'closed')
          and (vr.expires_at is null or vr.expires_at > statement_timestamp())
          and vr.requested_verifier_organization_id is not null
          and (vr.requested_verifier_actor_id is null or vr.requested_verifier_actor_id = sih26044.current_actor_id())
          and sih26044.has_any_active_organization_role(
            vr.requested_verifier_organization_id,
            array['faculty', 'issuer_verifier']::sih26044.actor_role[]
          )
          and sih26044.is_consent_active(
            vr.consent_grant_id,
            vr.subject_actor_id,
            vr.requested_verifier_organization_id,
            'evidence_verification'
          )
          and exists (
            select 1 from sih26044.consent_evidence_records ce
            where ce.consent_grant_id = vr.consent_grant_id
              and ce.evidence_record_id = vr.evidence_record_id
          )
        )
      )
  )
$$;

comment on function sih26044.can_access_verification_request(uuid) is
  'Allows the subject or the explicitly assigned active faculty or issuer verifier to read requested, accepted, and closed verification requests while the bounded evidence-verification consent remains active.';
