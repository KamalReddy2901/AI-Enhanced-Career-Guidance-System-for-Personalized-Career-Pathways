-- Provider-neutral notification events and durable outbox. Delivery remains
-- explicit: DEVELOPMENT/NOOP providers never claim external delivery.
create type sih26044.notification_purpose as enum (
  'verification_request', 'clarification', 'verification_result', 'evidence_request',
  'application_update', 'interview', 'offer_outcome', 'collaboration',
  'intervention_followup', 'expiry_revocation'
);
create type sih26044.notification_channel as enum ('in_app', 'email', 'sms', 'webhook');
create type sih26044.notification_outbox_status as enum ('queued', 'scheduled', 'claimed', 'sent', 'failed', 'suppressed', 'dead');

create table sih26044.notification_preferences (
  actor_id uuid not null references sih26044.actors(id) on delete cascade,
  purpose sih26044.notification_purpose not null,
  channel sih26044.notification_channel not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (actor_id, purpose, channel)
);

create table sih26044.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (length(btrim(event_key)) between 1 and 180),
  purpose sih26044.notification_purpose not null,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  reference_type text not null check (length(btrim(reference_type)) between 1 and 80),
  reference_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  check (jsonb_typeof(payload) = 'object'),
  check (not sih26044.has_prohibited_json_keys(payload))
);

create table sih26044.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references sih26044.notification_events(id) on delete restrict,
  actor_id uuid not null references sih26044.actors(id) on delete restrict,
  channel sih26044.notification_channel not null,
  template_key text not null check (length(btrim(template_key)) between 1 and 160),
  template_version integer not null check (template_version > 0),
  status sih26044.notification_outbox_status not null default 'queued',
  available_at timestamptz not null default statement_timestamp(),
  claimed_at timestamptz,
  lease_until timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_retry_at timestamptz,
  provider_reference text,
  last_error_code text,
  idempotency_key text not null unique,
  created_at timestamptz not null default statement_timestamp(),
  sent_at timestamptz,
  check (status <> 'claimed' or lease_until is not null),
  unique (event_id, actor_id, channel, template_key, template_version)
);
create trigger notification_events_immutable
before update or delete on sih26044.notification_events
for each row execute function sih26044.reject_historical_mutation();
create index notification_outbox_due_idx on sih26044.notification_outbox (status, available_at, next_retry_at);

alter table sih26044.notification_preferences enable row level security;
alter table sih26044.notification_events enable row level security;
alter table sih26044.notification_outbox enable row level security;
create policy notification_preferences_self on sih26044.notification_preferences
  for select to authenticated using (actor_id = sih26044.current_actor_id());
create policy notification_preferences_update_self on sih26044.notification_preferences
  for all to authenticated using (actor_id = sih26044.current_actor_id()) with check (actor_id = sih26044.current_actor_id());
create policy notification_events_self on sih26044.notification_events
  for select to authenticated using (actor_id = sih26044.current_actor_id());
create policy notification_outbox_self on sih26044.notification_outbox
  for select to authenticated using (actor_id = sih26044.current_actor_id());
revoke insert, update, delete on sih26044.notification_events from public, anon, authenticated;
revoke insert, update, delete on sih26044.notification_outbox from public, anon, authenticated;
grant select on sih26044.notification_events, sih26044.notification_outbox to authenticated;
grant select, insert, update, delete on sih26044.notification_preferences to authenticated;

create or replace function sih26044.claim_notification_outbox(
  requested_limit integer default 25,
  requested_lease_seconds integer default 300
)
returns setof sih26044.notification_outbox
language plpgsql security definer
set search_path = pg_catalog, sih26044
as $$
declare
  claimed sih26044.notification_outbox%rowtype;
  lease_end timestamptz := statement_timestamp() + make_interval(secs => least(greatest(requested_lease_seconds, 30), 900));
begin
  if sih26044.current_actor_id() is null then raise exception 'Authenticated SIH actor required'; end if;
  for claimed in
    select o.* from sih26044.notification_outbox o
    where o.status in ('queued', 'scheduled', 'failed')
      and o.available_at <= statement_timestamp()
      and (o.next_retry_at is null or o.next_retry_at <= statement_timestamp())
      and o.attempt_count < 5
    order by o.available_at, o.created_at
    for update skip locked limit least(greatest(requested_limit, 1), 100)
  loop
    update sih26044.notification_outbox o
      set status = 'claimed', claimed_at = statement_timestamp(), lease_until = lease_end,
          attempt_count = o.attempt_count + 1
      where o.id = claimed.id
      returning o.* into claimed;
    return next claimed;
  end loop;
end
$$;

revoke all on function sih26044.claim_notification_outbox(integer, integer) from public, anon;
grant execute on function sih26044.claim_notification_outbox(integer, integer) to authenticated;
grant execute on function sih26044.claim_notification_outbox(integer, integer) to service_role;

create or replace function sih26044.enqueue_notification(
  requested_event_key text,
  requested_purpose sih26044.notification_purpose,
  requested_actor_id uuid,
  requested_reference_type text,
  requested_reference_id uuid,
  requested_payload jsonb,
  requested_channel sih26044.notification_channel,
  requested_template_key text,
  requested_template_version integer,
  requested_idempotency_key text
)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, sih26044
as $$
declare event_id uuid;
begin
  if sih26044.has_prohibited_json_keys(requested_payload) then raise exception 'Notification payload contains prohibited fields'; end if;
  insert into sih26044.notification_events(event_key, purpose, actor_id, reference_type, reference_id, payload)
  values (requested_event_key, requested_purpose, requested_actor_id, requested_reference_type, requested_reference_id, coalesce(requested_payload, '{}'::jsonb))
  on conflict (event_key) do nothing
  returning id into event_id;
  if event_id is null then select id into event_id from sih26044.notification_events where event_key = requested_event_key; end if;
  insert into sih26044.notification_outbox(event_id, actor_id, channel, template_key, template_version, idempotency_key)
  values (event_id, requested_actor_id, requested_channel, requested_template_key, requested_template_version, requested_idempotency_key)
  on conflict (idempotency_key) do nothing;
  return event_id;
end
$$;
revoke all on function sih26044.enqueue_notification(text, sih26044.notification_purpose, uuid, text, uuid, jsonb, sih26044.notification_channel, text, integer, text) from public, anon, authenticated;
grant execute on function sih26044.enqueue_notification(text, sih26044.notification_purpose, uuid, text, uuid, jsonb, sih26044.notification_channel, text, integer, text) to service_role;
comment on table sih26044.notification_outbox is 'Durable provider-neutral queue. External delivery is unclaimed until a configured provider exists; DEVELOPMENT/NOOP is explicit.';
