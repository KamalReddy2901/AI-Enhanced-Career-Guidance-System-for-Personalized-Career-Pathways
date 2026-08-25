-- SIH26044 Foundation D1.2: final forward-only persistence trust hardening.
-- Migrations 001-007 remain unchanged to preserve the reviewed migration history.

-- ---------------------------------------------------------------------------
-- HumanConfirmationTrace exact-content binding for every SQL writer
-- ---------------------------------------------------------------------------

create or replace function sih26044.enforce_authenticated_requirement_confirmation()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  content_changed boolean := false;
  trace_changed boolean := false;
  fresh_confirmation boolean := false;
begin
  if tg_op = 'UPDATE' then
    content_changed := row(
      new.ordinal, new.literal_source_wording, new.category, new.priority,
      new.importance, new.evidence_expectation, new.hard_gate,
      new.canonical_resolution, new.canonical_skill_id, new.canonical_skill_label,
      new.minimum_proficiency, new.minimum_years, new.category_payload
    ) is distinct from row(
      old.ordinal, old.literal_source_wording, old.category, old.priority,
      old.importance, old.evidence_expectation, old.hard_gate,
      old.canonical_resolution, old.canonical_skill_id, old.canonical_skill_label,
      old.minimum_proficiency, old.minimum_years, old.category_payload
    );
    trace_changed := row(
      new.human_confirmed, new.confirmed_by_actor_id,
      new.confirmed_at, new.confirmation_method
    ) is distinct from row(
      old.human_confirmed, old.confirmed_by_actor_id,
      old.confirmed_at, old.confirmation_method
    );
  end if;

  if tg_op = 'INSERT' then
    fresh_confirmation := new.human_confirmed;
  else
    fresh_confirmation := new.human_confirmed and trace_changed;
  end if;

  -- This invalidation deliberately precedes writer-specific handling. A role
  -- with trusted table access cannot carry an unchanged confirmation trace
  -- across a change to the exact high-impact content that was confirmed.
  if content_changed and not fresh_confirmation then
    new.human_confirmed := false;
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
    return new;
  end if;

  if current_user = 'authenticated' then
    actor_id := sih26044.current_actor_id();
    if actor_id is null then
      raise exception 'An active SIH actor is required to confirm opportunity content';
    end if;
    if fresh_confirmation then
      if new.confirmed_by_actor_id is not null and new.confirmed_by_actor_id <> actor_id then
        raise exception 'Authenticated clients cannot impersonate another confirmation actor';
      end if;
      if new.confirmation_method is null
        or new.confirmation_method not in ('structured_human_entry', 'ai_assisted_review')
      then
        raise exception 'Authenticated confirmation requires a production human-review method';
      end if;
      new.confirmed_by_actor_id := actor_id;
      new.confirmed_at := statement_timestamp();
      return new;
    end if;
  elsif fresh_confirmation then
    -- Trusted workflows may preserve an intentionally supplied confirmation,
    -- including connector_review or controlled_fixture, but the database never
    -- treats the SQL/service role itself as a human confirmer or invents one.
    if new.confirmed_by_actor_id is null
      or new.confirmed_at is null
      or new.confirmation_method is null
      or not exists (
        select 1 from sih26044.actors a
        where a.id = new.confirmed_by_actor_id and a.status = 'active'
      )
    then
      raise exception 'Trusted confirmation requires an explicit active confirming actor, timestamp, and method';
    end if;
    return new;
  end if;

  if not new.human_confirmed then
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
  end if;
  return new;
end
$$;

create or replace function sih26044.enforce_authenticated_eligibility_confirmation()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  actor_id uuid;
  content_changed boolean := false;
  trace_changed boolean := false;
  fresh_confirmation boolean := false;
begin
  if tg_op = 'UPDATE' then
    content_changed := row(
      new.ordinal, new.rule_kind, new.literal_source_wording, new.typed_rule_definition
    ) is distinct from row(
      old.ordinal, old.rule_kind, old.literal_source_wording, old.typed_rule_definition
    );
    trace_changed := row(
      new.human_confirmed, new.confirmed_by_actor_id,
      new.confirmed_at, new.confirmation_method
    ) is distinct from row(
      old.human_confirmed, old.confirmed_by_actor_id,
      old.confirmed_at, old.confirmation_method
    );
  end if;

  if tg_op = 'INSERT' then
    fresh_confirmation := new.human_confirmed;
  else
    fresh_confirmation := new.human_confirmed and trace_changed;
  end if;

  -- Apply exact-content invalidation before distinguishing browser and trusted
  -- writers so no privileged path can retain an unchanged stale trace.
  if content_changed and not fresh_confirmation then
    new.human_confirmed := false;
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
    return new;
  end if;

  if current_user = 'authenticated' then
    actor_id := sih26044.current_actor_id();
    if actor_id is null then
      raise exception 'An active SIH actor is required to confirm eligibility content';
    end if;
    if fresh_confirmation then
      if new.confirmed_by_actor_id is not null and new.confirmed_by_actor_id <> actor_id then
        raise exception 'Authenticated clients cannot impersonate another confirmation actor';
      end if;
      if new.confirmation_method is null
        or new.confirmation_method not in ('structured_human_entry', 'ai_assisted_review')
      then
        raise exception 'Authenticated confirmation requires a production human-review method';
      end if;
      new.confirmed_by_actor_id := actor_id;
      new.confirmed_at := statement_timestamp();
      return new;
    end if;
  elsif fresh_confirmation then
    if new.confirmed_by_actor_id is null
      or new.confirmed_at is null
      or new.confirmation_method is null
      or not exists (
        select 1 from sih26044.actors a
        where a.id = new.confirmed_by_actor_id and a.status = 'active'
      )
    then
      raise exception 'Trusted confirmation requires an explicit active confirming actor, timestamp, and method';
    end if;
    return new;
  end if;

  if not new.human_confirmed then
    new.confirmed_by_actor_id := null;
    new.confirmed_at := null;
    new.confirmation_method := null;
  end if;
  return new;
end
$$;

comment on function sih26044.enforce_authenticated_requirement_confirmation() is
  'All-writer exact-content confirmation binding. Browser confirmation is actor-derived and server-timestamped; trusted confirmation must supply an explicit active human actor and fresh trace.';
comment on function sih26044.enforce_authenticated_eligibility_confirmation() is
  'All-writer exact-content confirmation binding. Browser confirmation is actor-derived and server-timestamped; trusted confirmation must supply an explicit active human actor and fresh trace.';

-- ---------------------------------------------------------------------------
-- Canonical artifact registration and historical linking are trusted writes
-- ---------------------------------------------------------------------------

drop policy if exists artifacts_insert_subject on sih26044.artifacts;
revoke insert on sih26044.artifacts from authenticated;

drop policy if exists evidence_artifact_links_insert_subject on sih26044.evidence_artifact_links;
revoke insert on sih26044.evidence_artifact_links from authenticated;

comment on table sih26044.artifacts is
  'Trusted-write canonical artifact registry. A learner may upload private bytes, but a future trusted adapter must verify actor/path ownership, compute the integrity fingerprint, choose a conservative initial scan state, and create metadata. Browser clients retain authorized SELECT only.';
comment on table sih26044.evidence_artifact_links is
  'Trusted-write append-only historical links. Browser clients may later request linking through a purpose-built adapter but cannot author canonical evidence-artifact relationships directly; authorized subject and assigned-verifier SELECT remains available.';
comment on column sih26044.artifacts.scan_status is
  'Trusted security-processing state only, normally initialized conservatively. It is separate from evidence provenance and verification and cannot promote either.';

-- ---------------------------------------------------------------------------
-- Browser evidence proposals cannot claim trusted connector attribution
-- ---------------------------------------------------------------------------

drop policy if exists evidence_records_insert_weak_subject on sih26044.evidence_records;
create policy evidence_records_insert_weak_subject
on sih26044.evidence_records for insert to authenticated
with check (
  subject_actor_id = sih26044.current_actor_id()
  and provenance in ('self_declared', 'self_reported', 'extracted', 'inferred')
  and initial_verification_state in ('proposed', 'unverified', 'self_confirmed')
  and (
    proposal_source is null
    or proposal_source in ('user_entry', 'ai_extraction', 'rule_based_extraction')
  )
);

comment on policy evidence_records_insert_weak_subject on sih26044.evidence_records is
  'Subject-owned weak evidence only. connector_import is reserved for a future trusted connector workflow; proposal source never upgrades provenance or verification.';
