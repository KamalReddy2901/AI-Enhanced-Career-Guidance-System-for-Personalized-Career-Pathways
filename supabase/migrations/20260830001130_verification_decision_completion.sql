-- SIH26044 shared verifier-decision authority. A terminal decision and its
-- request closure share one transaction boundary and one database timestamp.

create or replace function sih26044.complete_verification_request_decision(
  requested_verification_request_id uuid,
  requested_evidence_record_id uuid,
  requested_action sih26044.verification_action,
  requested_actor_organization_id uuid,
  requested_reason text default null
)
returns table (
  request_id uuid,
  request_evidence_record_id uuid,
  request_subject_actor_id uuid,
  request_requested_verifier_actor_id uuid,
  request_requested_verifier_organization_id uuid,
  request_consent_grant_id uuid,
  request_scope_kind sih26044.evidence_scope_kind,
  request_scope_skill_id text,
  request_scope_literal_skill_label text,
  request_scope_opportunity_id uuid,
  request_scope_requirement_id uuid,
  request_scope_organization_id uuid,
  request_scope_outcome_event_id uuid,
  request_status sih26044.verification_request_status,
  request_requested_at timestamptz,
  request_expires_at timestamptz,
  request_closed_at timestamptz,
  event_id uuid,
  event_sequence_number bigint,
  event_action sih26044.verification_action,
  event_actor_id uuid,
  event_actor_organization_id uuid,
  event_reason text,
  event_occurred_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid := sih26044.current_actor_id();
  decision_at timestamptz := statement_timestamp();
  locked_request sih26044.verification_requests%rowtype;
  inserted_event sih26044.verification_events%rowtype;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'No active SIH actor';
  end if;

  select vr.* into locked_request
  from sih26044.verification_requests vr
  where vr.id = requested_verification_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Verification request not found';
  end if;
  if locked_request.evidence_record_id <> requested_evidence_record_id then
    raise exception using errcode = '22023', message = 'Evidence record does not match verification request';
  end if;
  if locked_request.status not in ('requested', 'accepted') or locked_request.closed_at is not null then
    raise exception using errcode = '55000', message = 'Verification request is not open';
  end if;
  if locked_request.expires_at is not null and locked_request.expires_at <= decision_at then
    raise exception using errcode = '55000', message = 'Verification request has expired';
  end if;
  if requested_action not in ('verified_by_human', 'verified_by_issuer', 'disputed') then
    raise exception using errcode = '22023', message = 'Unsupported terminal verification action';
  end if;
  if requested_action = 'disputed' and nullif(btrim(requested_reason), '') is null then
    raise exception using errcode = '22023', message = 'Disputed decision requires a reason';
  end if;
  if locked_request.requested_verifier_organization_id is distinct from requested_actor_organization_id then
    raise exception using errcode = '42501', message = 'Verifier organization does not match request';
  end if;
  if not sih26044.can_access_verification_request(locked_request.id) then
    raise exception using errcode = '42501', message = 'Actor cannot access verification request';
  end if;
  if not sih26044.can_append_verification_event(
    locked_request.id,
    requested_action,
    requested_actor_organization_id
  ) then
    raise exception using errcode = '42501', message = 'Actor cannot complete requested verification decision';
  end if;

  insert into sih26044.verification_events (
    verification_request_id, evidence_record_id, action, actor_id,
    actor_organization_id, reason, occurred_at
  ) values (
    locked_request.id, locked_request.evidence_record_id, requested_action, actor_id,
    requested_actor_organization_id, nullif(btrim(requested_reason), ''), decision_at
  ) returning * into inserted_event;

  update sih26044.verification_requests
  set status = 'closed', closed_at = decision_at
  where id = locked_request.id
  returning * into locked_request;

  return query select
    locked_request.id, locked_request.evidence_record_id, locked_request.subject_actor_id,
    locked_request.requested_verifier_actor_id, locked_request.requested_verifier_organization_id,
    locked_request.consent_grant_id, locked_request.scope_kind, locked_request.scope_skill_id,
    locked_request.scope_literal_skill_label, locked_request.scope_opportunity_id,
    locked_request.scope_requirement_id, locked_request.scope_organization_id,
    locked_request.scope_outcome_event_id, locked_request.status, locked_request.requested_at,
    locked_request.expires_at, locked_request.closed_at, inserted_event.id,
    inserted_event.sequence_number, inserted_event.action, inserted_event.actor_id,
    inserted_event.actor_organization_id, inserted_event.reason, inserted_event.occurred_at;
end
$$;

revoke all on function sih26044.complete_verification_request_decision(
  uuid, uuid, sih26044.verification_action, uuid, text
) from public;
revoke all on function sih26044.complete_verification_request_decision(
  uuid, uuid, sih26044.verification_action, uuid, text
) from anon;
grant execute on function sih26044.complete_verification_request_decision(
  uuid, uuid, sih26044.verification_action, uuid, text
) to authenticated;

comment on function sih26044.complete_verification_request_decision(
  uuid, uuid, sih26044.verification_action, uuid, text
) is 'Atomically appends one bounded terminal verifier decision and closes its exact request using one authoritative database timestamp.';
