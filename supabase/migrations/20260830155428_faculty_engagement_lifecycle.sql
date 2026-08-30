-- CareerCase × SIH26044: authoritative faculty/industry collaboration lifecycle.
-- Existing collaboration_engagements remains the canonical aggregate object;
-- this migration adds append-only history and routes all future status changes
-- through a single actor- and organization-authorized function.

create type sih26044.collaboration_event_kind as enum (
  'created',
  'status_transition',
  'milestone',
  'deliverable',
  'feedback',
  'outcome'
);

create table sih26044.collaboration_engagement_events (
  id uuid primary key default gen_random_uuid(),
  collaboration_engagement_id uuid not null
    references sih26044.collaboration_engagements(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  kind sih26044.collaboration_event_kind not null,
  from_status sih26044.collaboration_status,
  to_status sih26044.collaboration_status,
  title text,
  detail text,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  organization_id uuid not null references sih26044.organizations(id) on delete restrict,
  occurred_at timestamptz not null default statement_timestamp(),
  unique (collaboration_engagement_id, sequence_number),
  check (title is null or length(btrim(title)) between 1 and 200),
  check (detail is null or length(btrim(detail)) between 1 and 4000),
  check (
    (kind in ('created', 'status_transition') and to_status is not null)
    or (kind not in ('created', 'status_transition') and from_status is null and to_status is null)
  ),
  check (kind <> 'status_transition' or from_status is not null),
  check (kind in ('created', 'status_transition') or title is not null)
);

create index collaboration_engagement_events_timeline_idx
  on sih26044.collaboration_engagement_events
  (collaboration_engagement_id, sequence_number desc);

insert into sih26044.collaboration_engagement_events (
  collaboration_engagement_id,
  sequence_number,
  kind,
  to_status,
  title,
  actor_id,
  organization_id,
  occurred_at
)
select
  c.id,
  1,
  'created',
  c.status,
  'Engagement record created',
  c.created_by_actor_id,
  c.host_organization_id,
  c.created_at
from sih26044.collaboration_engagements c;

create or replace function sih26044.initialize_collaboration_engagement_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  insert into sih26044.collaboration_engagement_events (
    collaboration_engagement_id,
    sequence_number,
    kind,
    to_status,
    title,
    actor_id,
    organization_id,
    occurred_at
  ) values (
    new.id,
    1,
    'created',
    new.status,
    'Engagement record created',
    new.created_by_actor_id,
    new.host_organization_id,
    new.created_at
  );
  return new;
end
$$;

create trigger initialize_collaboration_engagement_event
after insert on sih26044.collaboration_engagements
for each row execute function sih26044.initialize_collaboration_engagement_event();

revoke all on function sih26044.initialize_collaboration_engagement_event() from public, anon, authenticated;

alter table sih26044.collaboration_engagement_events enable row level security;

create policy collaboration_events_select_access
on sih26044.collaboration_engagement_events
for select to authenticated
using (sih26044.can_access_collaboration(collaboration_engagement_id));

create trigger collaboration_engagement_events_immutable
before update or delete on sih26044.collaboration_engagement_events
for each row execute function sih26044.reject_historical_mutation();

-- Direct status mutation would bypass the immutable event authority.
revoke update on sih26044.collaboration_engagements from authenticated;
revoke insert, update, delete on sih26044.collaboration_engagement_events from public, anon, authenticated;
grant select on sih26044.collaboration_engagement_events to authenticated;

create or replace function sih26044.append_collaboration_engagement_event(
  requested_collaboration_engagement_id uuid,
  requested_kind sih26044.collaboration_event_kind,
  requested_to_status sih26044.collaboration_status default null,
  requested_title text default null,
  requested_detail text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  current_actor uuid;
  host_organization uuid;
  current_status sih26044.collaboration_status;
  next_sequence integer;
  event_id uuid;
  is_host_operator boolean;
  is_participant boolean;
begin
  current_actor := sih26044.current_actor_id();
  if current_actor is null then
    raise exception 'An active SIH actor is required to update a collaboration engagement';
  end if;

  if requested_kind = 'created' then
    raise exception 'Created events are system-initialized and cannot be appended';
  end if;

  select c.host_organization_id, c.status
  into host_organization, current_status
  from sih26044.collaboration_engagements c
  where c.id = requested_collaboration_engagement_id
  for update;

  if host_organization is null then
    raise exception 'Collaboration engagement was not found or is not authorized';
  end if;

  is_host_operator := sih26044.has_any_active_organization_role(
    host_organization,
    array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
  );
  select exists (
    select 1
    from sih26044.collaboration_participants p
    where p.collaboration_engagement_id = requested_collaboration_engagement_id
      and p.actor_id = current_actor
  ) into is_participant;

  if requested_kind = 'status_transition' then
    if not is_host_operator then
      raise exception 'Collaboration engagement was not found or is not authorized';
    end if;
    if requested_to_status is null then
      raise exception 'A target status is required for a collaboration status transition';
    end if;
    if not (
      (current_status = 'proposed' and requested_to_status in ('approved', 'cancelled'))
      or (current_status = 'approved' and requested_to_status in ('active', 'cancelled'))
      or (current_status = 'active' and requested_to_status in ('completed', 'cancelled'))
    ) then
      raise exception 'Invalid collaboration lifecycle transition from % to %', current_status, requested_to_status;
    end if;
  else
    if requested_to_status is not null then
      raise exception 'Only status-transition events may specify a target status';
    end if;
    if not (is_host_operator or is_participant) then
      raise exception 'Collaboration engagement was not found or is not authorized';
    end if;
    if length(btrim(coalesce(requested_title, ''))) = 0 then
      raise exception 'Collaboration activity requires a title';
    end if;
    if requested_kind in ('milestone', 'deliverable', 'feedback')
       and current_status not in ('approved', 'active') then
      raise exception '% events require an approved or active engagement', requested_kind;
    end if;
    if requested_kind = 'outcome' and current_status <> 'completed' then
      raise exception 'Outcome events require a completed engagement';
    end if;
  end if;

  if requested_title is not null and length(btrim(requested_title)) > 200 then
    raise exception 'Collaboration event title must be 200 characters or fewer';
  end if;
  if requested_detail is not null and length(btrim(requested_detail)) > 4000 then
    raise exception 'Collaboration event detail must be 4000 characters or fewer';
  end if;

  select coalesce(max(e.sequence_number), 0) + 1
  into next_sequence
  from sih26044.collaboration_engagement_events e
  where e.collaboration_engagement_id = requested_collaboration_engagement_id;

  insert into sih26044.collaboration_engagement_events (
    collaboration_engagement_id,
    sequence_number,
    kind,
    from_status,
    to_status,
    title,
    detail,
    actor_id,
    organization_id
  ) values (
    requested_collaboration_engagement_id,
    next_sequence,
    requested_kind,
    case when requested_kind = 'status_transition' then current_status else null end,
    case when requested_kind = 'status_transition' then requested_to_status else null end,
    nullif(btrim(coalesce(requested_title, '')), ''),
    nullif(btrim(coalesce(requested_detail, '')), ''),
    current_actor,
    host_organization
  ) returning id into event_id;

  if requested_kind = 'status_transition' then
    update sih26044.collaboration_engagements
    set status = requested_to_status,
        updated_at = statement_timestamp()
    where id = requested_collaboration_engagement_id;
  end if;

  perform sih26044.record_authoritative_audit(
    current_actor,
    null,
    host_organization,
    'collaboration_engagement_event_appended',
    'collaboration_engagement',
    requested_collaboration_engagement_id::text,
    null,
    jsonb_build_object(
      'eventId', event_id,
      'kind', requested_kind,
      'sequenceNumber', next_sequence,
      'fromStatus', case when requested_kind = 'status_transition' then current_status else null end,
      'toStatus', case when requested_kind = 'status_transition' then requested_to_status else null end
    )
  );

  return event_id;
end
$$;

revoke all on function sih26044.append_collaboration_engagement_event(
  uuid,
  sih26044.collaboration_event_kind,
  sih26044.collaboration_status,
  text,
  text
) from public, anon;
grant execute on function sih26044.append_collaboration_engagement_event(
  uuid,
  sih26044.collaboration_event_kind,
  sih26044.collaboration_status,
  text,
  text
) to authenticated;
