-- Create an evidence-verification consent grant, bind the exact evidence row,
-- and open its scoped verification request in one transaction. The browser
-- supplies no subject identity and cannot alter the evidence scope.

create or replace function sih26044.create_verification_request_with_consent(
  requested_evidence_record_id uuid,
  requested_verifier_organization_id uuid,
  requested_expires_at timestamptz default null
)
returns table (
  verification_request_id uuid,
  consent_grant_id uuid
)
language plpgsql
security invoker
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  evidence sih26044.evidence_records%rowtype;
  created_consent_id uuid;
  created_request_id uuid;
begin
  actor_id := sih26044.current_actor_id();
  if actor_id is null then
    raise exception 'An active SIH actor is required to request verification';
  end if;

  if requested_verifier_organization_id is null then
    raise exception 'A verifier organization is required';
  end if;

  select record.*
  into evidence
  from sih26044.evidence_records record
  where record.id = requested_evidence_record_id
    and record.subject_actor_id = actor_id;

  if evidence.id is null then
    raise exception 'Evidence record was not found for the active subject';
  end if;

  insert into sih26044.consent_grants (
    subject_actor_id,
    grantee_organization_id,
    purpose,
    expires_at,
    created_by_actor_id
  ) values (
    actor_id,
    requested_verifier_organization_id,
    'evidence_verification',
    requested_expires_at,
    actor_id
  )
  returning id into created_consent_id;

  insert into sih26044.consent_evidence_records (
    consent_grant_id,
    evidence_record_id
  ) values (
    created_consent_id,
    evidence.id
  );

  insert into sih26044.verification_requests (
    evidence_record_id,
    subject_actor_id,
    requested_verifier_organization_id,
    consent_grant_id,
    scope_kind,
    scope_skill_id,
    scope_literal_skill_label,
    scope_opportunity_id,
    scope_requirement_id,
    scope_organization_id,
    scope_outcome_event_id,
    expires_at
  ) values (
    evidence.id,
    actor_id,
    requested_verifier_organization_id,
    created_consent_id,
    evidence.scope_kind,
    evidence.scope_skill_id,
    evidence.scope_literal_skill_label,
    evidence.scope_opportunity_id,
    evidence.scope_requirement_id,
    evidence.scope_organization_id,
    evidence.scope_outcome_event_id,
    requested_expires_at
  )
  returning id into created_request_id;

  return query select created_request_id, created_consent_id;
end
$$;

revoke all on function sih26044.create_verification_request_with_consent(uuid, uuid, timestamptz)
from public, anon;
grant execute on function sih26044.create_verification_request_with_consent(uuid, uuid, timestamptz)
to authenticated;

comment on function sih26044.create_verification_request_with_consent(uuid, uuid, timestamptz) is
  'Atomic subject-owned verification request creation. Actor identity and exact evidence scope are database-derived; consent is purpose-specific and bound to one evidence record.';
