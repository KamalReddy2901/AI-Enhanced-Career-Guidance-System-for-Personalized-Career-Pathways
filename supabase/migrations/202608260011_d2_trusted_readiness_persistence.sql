-- SIH26044 D2-A: canonical readiness inputs and the narrow trusted persistence RPC.

create type sih26044.readiness_education_level as enum (
  'below_10', 'class_10', 'class_12', 'iti_diploma', 'undergraduate', 'postgraduate'
);
create type sih26044.readiness_capability_assertion as enum (
  'supports', 'partial', 'does_not_meet', 'not_applicable'
);
create type sih26044.readiness_evidence_directness as enum ('direct', 'explicit_claim', 'indirect');

create table sih26044.readiness_subject_facts (
  subject_actor_id uuid primary key references sih26044.actors(id) on delete restrict,
  education_level sih26044.readiness_education_level,
  education_level_confirmed boolean not null default false,
  graduation_year integer check (graduation_year between 1900 and 2200),
  graduation_year_confirmed boolean not null default false,
  physical_presence_locations jsonb not null default '[]'::jsonb
    check (jsonb_typeof(physical_presence_locations) = 'array'),
  physical_presence_locations_complete boolean not null default false,
  eligibility_facts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(eligibility_facts) = 'array'),
  work_authorizations jsonb not null default '[]'::jsonb
    check (jsonb_typeof(work_authorizations) = 'array'),
  relevant_languages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(relevant_languages) = 'array'),
  relevant_languages_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  check (education_level is not null or not education_level_confirmed),
  check (graduation_year is not null or not graduation_year_confirmed)
);

alter table sih26044.evidence_records
  add constraint evidence_records_id_subject_unique unique (id, subject_actor_id);

create table sih26044.readiness_evidence_projections (
  evidence_record_id uuid primary key,
  subject_actor_id uuid not null,
  requirement_id uuid references sih26044.opportunity_requirements(id) on delete restrict,
  skill_id text,
  literal_skill_label text,
  literal_requirement_wording text,
  proficiency smallint check (proficiency between 0 and 4),
  experience_years numeric(6,2) check (experience_years >= 0),
  capability_assertion sih26044.readiness_capability_assertion,
  directness sih26044.readiness_evidence_directness not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (evidence_record_id, subject_actor_id)
    references sih26044.evidence_records(id, subject_actor_id) on delete restrict,
  check (skill_id is null or length(btrim(skill_id)) > 0),
  check (literal_skill_label is null or length(btrim(literal_skill_label)) > 0),
  check (literal_requirement_wording is null or length(btrim(literal_requirement_wording)) > 0)
);

create or replace function sih26044.validate_readiness_evidence_projection()
returns trigger
language plpgsql
set search_path = pg_catalog, sih26044
as $$
declare
  evidence sih26044.evidence_records%rowtype;
begin
  select * into evidence from sih26044.evidence_records where id = new.evidence_record_id;
  if evidence.id is null or evidence.subject_actor_id <> new.subject_actor_id then
    raise exception 'Readiness evidence projection must match its canonical evidence subject';
  end if;
  if new.requirement_id is not null and (
    evidence.scope_kind <> 'opportunity'
    or evidence.scope_requirement_id is distinct from new.requirement_id
  ) then
    raise exception 'Requirement-scoped readiness projection must match the evidence scope';
  end if;
  if evidence.scope_kind = 'global_skill' and (
    new.requirement_id is not null
    or new.skill_id is distinct from evidence.scope_skill_id
    or new.literal_skill_label is distinct from evidence.scope_literal_skill_label
  ) then
    raise exception 'Global-skill readiness projection must preserve the canonical evidence scope';
  end if;
  return new;
end
$$;

create trigger validate_readiness_evidence_projection
before insert or update on sih26044.readiness_evidence_projections
for each row execute function sih26044.validate_readiness_evidence_projection();
create trigger readiness_evidence_projections_immutable
before update or delete on sih26044.readiness_evidence_projections
for each row execute function sih26044.reject_historical_mutation();

alter table sih26044.readiness_subject_facts enable row level security;
alter table sih26044.readiness_evidence_projections enable row level security;
grant select on sih26044.readiness_subject_facts, sih26044.readiness_evidence_projections to authenticated;
create policy readiness_subject_facts_select_self
on sih26044.readiness_subject_facts for select to authenticated
using (subject_actor_id = sih26044.current_actor_id());
create policy readiness_evidence_projections_select_self
on sih26044.readiness_evidence_projections for select to authenticated
using (subject_actor_id = sih26044.current_actor_id());

create unique index opportunity_readiness_results_semantic_identity
on sih26044.opportunity_readiness_results (
  subject_actor_id, opportunity_version_id, engine_version, evidence_policy_version,
  input_version, subject_facts_version, evidence_projection_version
);

create or replace function sih26044.persist_trusted_readiness_result(
  p_id uuid,
  p_subject_actor_id uuid,
  p_opportunity_id uuid,
  p_opportunity_version_id uuid,
  p_engine_version text,
  p_evidence_policy_version text,
  p_input_version text,
  p_subject_facts_version text,
  p_evidence_projection_version text,
  p_readiness_band sih26044.readiness_band,
  p_result_body jsonb,
  p_generated_at timestamptz
)
returns setof sih26044.opportunity_readiness_results
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  if p_result_body is null or jsonb_typeof(p_result_body) <> 'object'
    or (select array_agg(result_key order by result_key) from jsonb_object_keys(p_result_body) as result_key)
      is distinct from array[
        'eligibilityRuleResults', 'eligibilityStatus', 'engineVersion', 'evidenceCoverage',
        'evidenceProjectionVersion', 'gapCount', 'generatedAt', 'inputVersion',
        'learningDistance', 'opportunityId', 'opportunityVersion', 'opportunityVersionId',
        'partialCount', 'policyVersion', 'preferredRequirementResults', 'readinessBand',
        'relevantWorkSamples', 'requiredCoverage', 'requiredRequirementResults', 'resultId',
        'subjectActorId', 'subjectFactsVersion', 'verificationCoverage'
      ]::text[]
    or p_result_body::text ~* '(riasec|work_values|workValues|aspiration|counselor|private_guidance|privateGuidance)'
    or not exists (
      select 1 from sih26044.actors a
      where a.id = p_subject_actor_id and a.status = 'active'
    )
    or not exists (
      select 1 from sih26044.opportunity_versions v
      where v.id = p_opportunity_version_id
        and v.opportunity_id = p_opportunity_id
        and v.status = 'published'
    )
    or p_result_body ->> 'resultId' is distinct from p_id::text
    or p_result_body ->> 'subjectActorId' is distinct from p_subject_actor_id::text
    or p_result_body ->> 'opportunityId' is distinct from p_opportunity_id::text
    or p_result_body ->> 'opportunityVersionId' is distinct from p_opportunity_version_id::text
    or p_result_body ->> 'engineVersion' is distinct from p_engine_version
    or p_result_body ->> 'policyVersion' is distinct from p_evidence_policy_version
    or p_result_body ->> 'inputVersion' is distinct from p_input_version
    or p_result_body ->> 'subjectFactsVersion' is distinct from p_subject_facts_version
    or p_result_body ->> 'evidenceProjectionVersion' is distinct from p_evidence_projection_version
    or p_result_body ->> 'readinessBand' is distinct from p_readiness_band::text
    or (p_result_body ->> 'generatedAt')::timestamptz is distinct from p_generated_at
    or length(btrim(p_engine_version)) = 0
    or length(btrim(p_evidence_policy_version)) = 0
    or length(btrim(p_input_version)) = 0
    or length(btrim(p_subject_facts_version)) = 0
    or length(btrim(p_evidence_projection_version)) = 0
  then
    raise exception 'Trusted readiness result relationships or canonical fields are invalid';
  end if;

  insert into sih26044.opportunity_readiness_results (
    id, subject_actor_id, opportunity_id, opportunity_version_id, engine_version,
    evidence_policy_version, input_version, subject_facts_version,
    evidence_projection_version, readiness_band, result_body, generated_at
  ) values (
    p_id, p_subject_actor_id, p_opportunity_id, p_opportunity_version_id, p_engine_version,
    p_evidence_policy_version, p_input_version, p_subject_facts_version,
    p_evidence_projection_version, p_readiness_band, p_result_body, p_generated_at
  ) on conflict do nothing;

  return query
  select result.* from sih26044.opportunity_readiness_results result
  where result.subject_actor_id = p_subject_actor_id
    and result.opportunity_version_id = p_opportunity_version_id
    and result.engine_version = p_engine_version
    and result.evidence_policy_version = p_evidence_policy_version
    and result.input_version = p_input_version
    and result.subject_facts_version = p_subject_facts_version
    and result.evidence_projection_version = p_evidence_projection_version;
end
$$;

revoke all on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz
) from public, anon, authenticated;
grant usage on schema sih26044 to service_role;
grant execute on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz
) to service_role;

comment on table sih26044.readiness_subject_facts is
  'Typed, purpose-limited Engine B facts only. Private Career Guidance fields are not represented.';
comment on table sih26044.readiness_evidence_projections is
  'Deterministic capability projection over canonical evidence. It does not change provenance or verification.';
comment on function sih26044.persist_trusted_readiness_result(
  uuid, uuid, uuid, uuid, text, text, text, text, text,
  sih26044.readiness_band, jsonb, timestamptz
) is
  'Server-only idempotent D2-A readiness write. Caller identity is resolved before elevated invocation.';
