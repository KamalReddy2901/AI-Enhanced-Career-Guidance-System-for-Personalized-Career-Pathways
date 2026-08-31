-- Migration 202608260018: Hosted readiness projection runtime fix
--
-- Hosted execution of the frozen 001-017 chain exposed a real runtime defect
-- in the canonical save_readiness_evidence_projection RPC: migration 016
-- checks v_existing.id even though readiness_evidence_projections is keyed by
-- evidence_record_id and has no id column. The same body also lost the active
-- confirmer validation/audit write from migration 014 and used non-null-safe
-- semantic comparisons.
--
-- Repair forward without changing the canonical RPC signature or widening
-- privileges. Identical semantic retries return the existing immutable row;
-- changed semantic material or confirmation trace conflicts are rejected.

create or replace function sih26044.save_readiness_evidence_projection(
  p_evidence_record_id uuid,
  p_subject_actor_id uuid,
  p_requirement_id uuid,
  p_skill_id text,
  p_literal_skill_label text,
  p_literal_requirement_wording text,
  p_proficiency smallint,
  p_experience_years numeric,
  p_capability_assertion sih26044.readiness_capability_assertion,
  p_directness sih26044.readiness_evidence_directness,
  p_observed_at timestamptz,
  p_confirmed_by_actor_id uuid,
  p_confirmation_method text
)
returns setof sih26044.readiness_evidence_projections
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_evidence sih26044.evidence_records%rowtype;
  v_existing sih26044.readiness_evidence_projections%rowtype;
begin
  select evidence_row.* into v_evidence
  from sih26044.evidence_records as evidence_row
  where evidence_row.id = p_evidence_record_id;

  if v_evidence.id is null or v_evidence.subject_actor_id <> p_subject_actor_id then
    raise exception 'Evidence record not found or subject actor mismatch';
  end if;

  if p_confirmed_by_actor_id is null or p_confirmed_by_actor_id <> p_subject_actor_id then
    raise exception 'Human confirmation must match subject actor';
  end if;

  if not exists (
    select 1
    from sih26044.actors as confirming_actor
    where confirming_actor.id = p_confirmed_by_actor_id
      and confirming_actor.status = 'active'
  ) then
    raise exception 'Confirming actor must be active';
  end if;

  if p_confirmation_method is null
    or p_confirmation_method not in ('structured_human_entry', 'ai_assisted_review') then
    raise exception 'Invalid human confirmation method';
  end if;

  select projection_row.* into v_existing
  from sih26044.readiness_evidence_projections as projection_row
  where projection_row.evidence_record_id = p_evidence_record_id;

  if v_existing.evidence_record_id is not null then
    if v_existing.subject_actor_id is distinct from p_subject_actor_id
      or v_existing.requirement_id is distinct from p_requirement_id
      or v_existing.skill_id is distinct from p_skill_id
      or v_existing.literal_skill_label is distinct from p_literal_skill_label
      or v_existing.literal_requirement_wording is distinct from p_literal_requirement_wording
      or v_existing.proficiency is distinct from p_proficiency
      or v_existing.experience_years is distinct from p_experience_years
      or v_existing.capability_assertion is distinct from p_capability_assertion
      or v_existing.directness is distinct from p_directness
      or v_existing.observed_at is distinct from p_observed_at
      or v_existing.human_confirmed is distinct from true
      or v_existing.confirmed_by_actor_id is distinct from p_confirmed_by_actor_id
      or v_existing.confirmation_method is distinct from p_confirmation_method
    then
      raise exception 'Capability projection conflict: different immutable material for the same evidence record';
    end if;

    return query
      select projection_row.*
      from sih26044.readiness_evidence_projections as projection_row
      where projection_row.evidence_record_id = p_evidence_record_id;
    return;
  end if;

  insert into sih26044.readiness_evidence_projections as projection_row (
    evidence_record_id,
    subject_actor_id,
    requirement_id,
    skill_id,
    literal_skill_label,
    literal_requirement_wording,
    proficiency,
    experience_years,
    capability_assertion,
    directness,
    observed_at,
    human_confirmed,
    confirmed_by_actor_id,
    confirmed_at,
    confirmation_method,
    created_at
  ) values (
    p_evidence_record_id,
    p_subject_actor_id,
    p_requirement_id,
    p_skill_id,
    p_literal_skill_label,
    p_literal_requirement_wording,
    p_proficiency,
    p_experience_years,
    p_capability_assertion,
    p_directness,
    p_observed_at,
    true,
    p_confirmed_by_actor_id,
    statement_timestamp(),
    p_confirmation_method,
    statement_timestamp()
  );

  perform sih26044.record_authoritative_audit(
    p_subject_actor_id,
    null,
    null,
    'project_readiness_evidence',
    'readiness_evidence_projections',
    p_evidence_record_id::text,
    null,
    jsonb_build_object(
      'evidenceRecordId', p_evidence_record_id,
      'confirmationMethod', p_confirmation_method
    )
  );

  return query
    select projection_row.*
    from sih26044.readiness_evidence_projections as projection_row
    where projection_row.evidence_record_id = p_evidence_record_id;
end;
$$;

revoke all on function sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text, smallint, numeric,
  sih26044.readiness_capability_assertion,
  sih26044.readiness_evidence_directness,
  timestamptz, uuid, text
) from public, anon, authenticated;

grant execute on function sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text, smallint, numeric,
  sih26044.readiness_capability_assertion,
  sih26044.readiness_evidence_directness,
  timestamptz, uuid, text
) to service_role;

comment on function sih26044.save_readiness_evidence_projection(
  uuid, uuid, uuid, text, text, text, smallint, numeric,
  sih26044.readiness_capability_assertion,
  sih26044.readiness_evidence_directness,
  timestamptz, uuid, text
) is
  'Canonical server-only readiness evidence projection write. Hosted-runtime fix: uses evidence_record_id identity, null-safe full semantic comparison, active human confirmer validation, append-only audit, and exact service_role-only execution.';
