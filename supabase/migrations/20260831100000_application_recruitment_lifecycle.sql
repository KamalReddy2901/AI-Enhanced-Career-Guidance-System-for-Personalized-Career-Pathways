-- CareerCase × SIH26044: attributable, append-only recruitment action detail.
-- Stage history remains in application_events. This ledger carries the
-- structured human context that a stage name alone cannot represent.

create type sih26044.application_recruitment_record_kind as enum (
  'stage_transition',
  'evidence_request',
  'evidence_response',
  'interview_scheduled',
  'interview_completed',
  'offer',
  'outcome',
  'feedback',
  'recruiter_note'
);

create type sih26044.application_record_visibility as enum (
  'applicant_and_recruiter',
  'recruiter_internal'
);

create table sih26044.application_recruitment_records (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity unique,
  application_id uuid not null references sih26044.applications(id) on delete restrict,
  application_event_id uuid references sih26044.application_events(id) on delete restrict,
  outcome_event_id uuid references sih26044.outcome_events(id) on delete restrict,
  kind sih26044.application_recruitment_record_kind not null,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  actor_organization_id uuid references sih26044.organizations(id) on delete restrict,
  visibility sih26044.application_record_visibility not null default 'applicant_and_recruiter',
  message text,
  scheduled_at timestamptz,
  schedule_timezone text,
  interaction_mode text,
  location_reference text,
  expires_at timestamptz,
  outcome_kind sih26044.outcome_kind,
  occurred_at timestamptz not null default statement_timestamp(),
  check (message is null or length(btrim(message)) > 0),
  check (schedule_timezone is null or length(btrim(schedule_timezone)) > 0),
  check (interaction_mode is null or length(btrim(interaction_mode)) > 0),
  check (location_reference is null or length(btrim(location_reference)) > 0),
  check (expires_at is null or expires_at >= occurred_at),
  check (
    (kind = 'evidence_request' and message is not null and application_event_id is not null)
    or (kind = 'evidence_response' and message is not null and application_event_id is null)
    or (kind = 'interview_scheduled' and scheduled_at is not null and schedule_timezone is not null and interaction_mode is not null and application_event_id is not null)
    or (kind = 'interview_completed' and application_event_id is null)
    or (kind = 'offer' and message is not null and application_event_id is not null)
    or (kind = 'outcome' and outcome_kind is not null and outcome_event_id is not null and application_event_id is not null)
    or (kind = 'feedback' and message is not null and application_event_id is null)
    or (kind = 'stage_transition' and application_event_id is not null)
    or (kind = 'recruiter_note' and message is not null and visibility = 'recruiter_internal')
  ),
  check (
    (visibility = 'recruiter_internal' and kind = 'recruiter_note')
    or (visibility = 'applicant_and_recruiter' and kind <> 'recruiter_note')
  )
);

create index application_recruitment_records_application_idx
  on sih26044.application_recruitment_records (application_id, sequence_number);

create trigger application_recruitment_records_immutable
before update or delete on sih26044.application_recruitment_records
for each row execute function sih26044.reject_historical_mutation();

alter table sih26044.application_recruitment_records enable row level security;

create policy application_recruitment_records_select_bounded
on sih26044.application_recruitment_records
for select to authenticated
using (
  exists (
    select 1
    from sih26044.applications a
    where a.id = application_id
      and (
        (
          a.applicant_actor_id = sih26044.current_actor_id()
          and visibility = 'applicant_and_recruiter'
        )
        or sih26044.can_recruiter_read_application(a.id)
      )
  )
);

grant select on sih26044.application_recruitment_records to authenticated;
revoke insert, update, delete on sih26044.application_recruitment_records from public, anon, authenticated;

create or replace function sih26044.record_application_recruitment_action(
  requested_application_id uuid,
  requested_expected_from_stage sih26044.application_stage,
  requested_to_stage sih26044.application_stage,
  requested_kind sih26044.application_recruitment_record_kind,
  requested_message text default null,
  requested_reason text default null,
  requested_internal_note text default null,
  requested_scheduled_at timestamptz default null,
  requested_schedule_timezone text default null,
  requested_interaction_mode text default null,
  requested_location_reference text default null,
  requested_expires_at timestamptz default null,
  requested_outcome_kind sih26044.outcome_kind default null
)
returns table (
  application_event_id uuid,
  recruitment_record_id uuid,
  resulting_stage sih26044.application_stage,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  target sih26044.applications%rowtype;
  acting_actor_id uuid := sih26044.current_actor_id();
  actual_stage sih26044.application_stage;
  is_applicant boolean;
  is_recruiter boolean;
  action_time timestamptz := statement_timestamp();
  event_kind sih26044.application_event_kind;
  inserted_event sih26044.application_events%rowtype;
  inserted_record sih26044.application_recruitment_records%rowtype;
  inserted_outcome sih26044.outcome_events%rowtype;
  effective_kind sih26044.application_recruitment_record_kind := requested_kind;
begin
  if acting_actor_id is null then raise exception 'Authenticated SIH actor required'; end if;

  select * into target from sih26044.applications
  where id = requested_application_id for update;
  if target.id is null then raise exception 'Application not found'; end if;

  actual_stage := sih26044.current_application_stage(target.id);
  if actual_stage <> requested_expected_from_stage then
    raise exception 'Application stage changed before this action was recorded';
  end if;

  is_applicant := target.applicant_actor_id = acting_actor_id;
  is_recruiter := sih26044.has_any_active_organization_role(
    target.owner_organization_id,
    array['recruiter', 'industry_partner']::sih26044.actor_role[]
  ) and sih26044.can_recruiter_read_application(target.id);

  if requested_kind in ('evidence_response', 'feedback') then
    if not is_applicant and not is_recruiter then raise exception 'Application action is not authorized'; end if;
    if requested_to_stage is not null then raise exception 'This application action does not change stage'; end if;
    if nullif(btrim(requested_message), '') is null then raise exception 'A shared response or feedback message is required'; end if;
  elsif requested_kind = 'interview_completed' then
    if not is_recruiter then raise exception 'Only an authorized recruiter can record interview completion'; end if;
    if actual_stage <> 'interview' or requested_to_stage is not null then
      raise exception 'Interview completion requires the current interview stage and does not change stage';
    end if;
  else
    if requested_to_stage is null then raise exception 'This application action requires a stage transition'; end if;
    event_kind := case when requested_to_stage = 'rejected_by_human'
      then 'human_rejection'::sih26044.application_event_kind
      else 'stage_transition'::sih26044.application_event_kind end;
    if not sih26044.can_append_application_event(target.id, requested_to_stage, event_kind) then
      raise exception 'Application stage transition is not authorized';
    end if;
    if not sih26044.application_transition_allowed(actual_stage, requested_to_stage) then
      raise exception 'Application stage transition is not allowed';
    end if;

    if requested_to_stage = 'evidence_requested' then
      effective_kind := 'evidence_request';
      if nullif(btrim(requested_message), '') is null then raise exception 'Evidence request details are required'; end if;
    elsif requested_to_stage = 'interview' then
      effective_kind := 'interview_scheduled';
      if requested_scheduled_at is null or nullif(btrim(requested_schedule_timezone), '') is null
        or nullif(btrim(requested_interaction_mode), '') is null then
        raise exception 'Interview schedule, timezone and mode are required';
      end if;
    elsif requested_to_stage = 'offered' then
      effective_kind := 'offer';
      if nullif(btrim(requested_message), '') is null then raise exception 'Offer summary is required'; end if;
    elsif requested_to_stage = 'outcome_recorded' then
      effective_kind := 'outcome';
      if requested_outcome_kind is null then raise exception 'Outcome kind is required'; end if;
    else
      effective_kind := 'stage_transition';
    end if;

    insert into sih26044.application_events (
      application_id, from_stage, to_stage, event_kind, actor_id, reason, note, occurred_at
    ) values (
      target.id, actual_stage, requested_to_stage, event_kind, acting_actor_id,
      case when requested_to_stage = 'rejected_by_human' then nullif(btrim(requested_reason), '') else null end,
      nullif(btrim(requested_message), ''), action_time
    ) returning * into inserted_event;

    if requested_to_stage = 'outcome_recorded' then
      insert into sih26044.outcome_events (
        kind, subject_actor_id, organization_id, opportunity_id, application_id,
        recorded_by_actor_id, occurred_at
      ) values (
        requested_outcome_kind, target.applicant_actor_id, target.owner_organization_id,
        target.opportunity_id, target.id, acting_actor_id, action_time
      ) returning * into inserted_outcome;
    end if;
  end if;

  insert into sih26044.application_recruitment_records (
    application_id, application_event_id, outcome_event_id, kind, actor_id,
    actor_organization_id, visibility, message, scheduled_at, schedule_timezone,
    interaction_mode, location_reference, expires_at, outcome_kind, occurred_at
  ) values (
    target.id, inserted_event.id, inserted_outcome.id, effective_kind, acting_actor_id,
    case when is_recruiter then target.owner_organization_id else null end,
    'applicant_and_recruiter', nullif(btrim(requested_message), ''),
    requested_scheduled_at, nullif(btrim(requested_schedule_timezone), ''),
    nullif(btrim(requested_interaction_mode), ''), nullif(btrim(requested_location_reference), ''),
    requested_expires_at, requested_outcome_kind, action_time
  ) returning * into inserted_record;

  if is_recruiter and nullif(btrim(requested_internal_note), '') is not null then
    insert into sih26044.application_recruitment_records (
      application_id, application_event_id, kind, actor_id, actor_organization_id,
      visibility, message, occurred_at
    ) values (
      target.id, inserted_event.id, 'recruiter_note', acting_actor_id,
      target.owner_organization_id, 'recruiter_internal',
      btrim(requested_internal_note), action_time
    );
  elsif requested_internal_note is not null then
    raise exception 'Only an authorized recruiter can record an internal note';
  end if;

  return query select inserted_event.id, inserted_record.id,
    coalesce(requested_to_stage, actual_stage), action_time;
end
$$;

revoke all on function sih26044.record_application_recruitment_action(
  uuid, sih26044.application_stage, sih26044.application_stage,
  sih26044.application_recruitment_record_kind, text, text, text,
  timestamptz, text, text, text, timestamptz, sih26044.outcome_kind
) from public, anon;
grant execute on function sih26044.record_application_recruitment_action(
  uuid, sih26044.application_stage, sih26044.application_stage,
  sih26044.application_recruitment_record_kind, text, text, text,
  timestamptz, text, text, text, timestamptz, sih26044.outcome_kind
) to authenticated;

comment on table sih26044.application_recruitment_records is
  'Append-only, actor-attributed recruitment detail. Applicant-visible records and recruiter-internal notes are separated by row-level visibility.';
