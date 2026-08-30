-- CareerCase × SIH26044 convergence: exact submission authority and lossless resolution.
create type sih26044.requirement_resolution_status as enum ('resolved', 'review_required', 'unresolved');

alter table sih26044.opportunity_requirements
  add column resolution_status sih26044.requirement_resolution_status,
  add column resolution_suggestions jsonb not null default '[]'::jsonb;

update sih26044.opportunity_requirements set resolution_status = case
  when category <> 'skill' then null
  when canonical_resolution in ('exact', 'alias') then 'resolved'::sih26044.requirement_resolution_status
  else 'unresolved'::sih26044.requirement_resolution_status end;

alter table sih26044.opportunity_requirements
  add constraint opportunity_requirements_resolution_suggestions_array check (jsonb_typeof(resolution_suggestions) = 'array'),
  add constraint opportunity_requirements_resolution_status_consistent check (
    (category <> 'skill' and resolution_status is null and resolution_suggestions = '[]'::jsonb)
    or (category = 'skill' and resolution_status is not null and (
      (resolution_status = 'resolved' and canonical_resolution in ('exact', 'alias') and canonical_skill_id is not null and resolution_suggestions = '[]'::jsonb)
      or (resolution_status = 'review_required' and canonical_resolution = 'unresolved' and canonical_skill_id is null and jsonb_array_length(resolution_suggestions) > 0 and human_confirmed = false)
      or (resolution_status = 'unresolved' and canonical_resolution = 'unresolved' and canonical_skill_id is null and resolution_suggestions = '[]'::jsonb)
    ))
  );

comment on column sih26044.opportunity_requirements.resolution_status is
  'review_required is non-authoritative and cannot be published until a human resolves it or explicitly retains literal wording as unresolved.';
comment on column sih26044.opportunity_requirements.resolution_suggestions is
  'Non-authoritative candidate matches retained only for human review.';

alter table sih26044.application_events
  add column application_snapshot_id uuid references sih26044.application_snapshots(id) on delete restrict,
  add constraint application_events_submission_snapshot_shape check (
    (to_stage = 'applied' and application_snapshot_id is not null)
    or (to_stage <> 'applied' and application_snapshot_id is null)
  );

create unique index application_events_one_submission on sih26044.application_events (application_id) where to_stage = 'applied';
create index application_events_submission_snapshot_idx on sih26044.application_events (application_snapshot_id) where application_snapshot_id is not null;

create or replace function sih26044.enforce_application_event_sequence()
returns trigger language plpgsql set search_path = pg_catalog, sih26044 as $$
declare actual_stage sih26044.application_stage;
begin
  perform 1 from sih26044.applications where id = new.application_id for update;
  actual_stage := sih26044.current_application_stage(new.application_id);
  if actual_stage is null or new.from_stage <> actual_stage then raise exception 'Application event from_stage does not match current append-only history'; end if;
  if not sih26044.application_transition_allowed(new.from_stage, new.to_stage) then raise exception 'Application stage transition is not allowed'; end if;
  if new.to_stage = 'applied' and not exists (
    select 1 from sih26044.application_snapshots s join sih26044.applications a on a.id = s.application_id
    where s.id = new.application_snapshot_id and s.application_id = new.application_id
      and s.opportunity_version_id = a.opportunity_version_id and s.finalized_at is not null and s.integrity_fingerprint is not null
  ) then raise exception 'Submission must bind the exact finalized immutable snapshot for this application and opportunity version'; end if;
  return new;
end $$;

create or replace function sih26044.can_recruiter_read_application(requested_application_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, sih26044 as $$
  select exists (
    select 1 from sih26044.applications a
    join sih26044.application_events submitted on submitted.application_id = a.id and submitted.to_stage = 'applied'
    join sih26044.application_snapshots s on s.id = submitted.application_snapshot_id and s.application_id = a.id and s.finalized_at is not null
    join sih26044.application_snapshot_consents sc on sc.application_snapshot_id = s.id
    join sih26044.consent_grants g on g.id = sc.consent_grant_id
    where a.id = requested_application_id
      and sih26044.has_any_active_organization_role(a.owner_organization_id, array['recruiter', 'industry_partner']::sih26044.actor_role[])
      and sih26044.current_application_stage(a.id) not in ('saved', 'preparing')
      and sih26044.is_consent_active(g.id, a.applicant_actor_id, a.owner_organization_id, 'application_review')
  )
$$;

revoke execute on function sih26044.enforce_application_event_sequence() from public, anon, authenticated;
revoke execute on function sih26044.protect_published_opportunity_child() from public, anon, authenticated;
revoke execute on function sih26044.protect_published_opportunity_version() from public, anon, authenticated;
revoke execute on function sih26044.protect_finalized_snapshot() from public, anon, authenticated;
revoke execute on function sih26044.protect_finalized_snapshot_link() from public, anon, authenticated;

comment on column sih26044.application_events.application_snapshot_id is
  'Exact immutable snapshot submitted on the append-only transition to applied; never inferred by recency.';
