-- CareerCase x SIH26044: bounded assessed evidence and exact questionnaire
-- disclosure binding. Questionnaire results remain context-bound assessments;
-- they are never promoted to human- or issuer-verified evidence.

create table sih26044.questionnaire_submission_evidence (
  questionnaire_submission_id uuid primary key
    references sih26044.questionnaire_submissions(id) on delete restrict,
  evidence_record_id uuid not null unique
    references sih26044.evidence_records(id) on delete restrict,
  questionnaire_id uuid not null
    references sih26044.questionnaires(id) on delete restrict,
  questionnaire_version_id uuid not null
    references sih26044.questionnaire_versions(id) on delete restrict,
  owner_organization_id uuid not null
    references sih26044.organizations(id) on delete restrict,
  respondent_actor_id uuid not null
    references sih26044.actors(id) on delete restrict,
  opportunity_id uuid references sih26044.opportunities(id) on delete restrict,
  opportunity_version_id uuid references sih26044.opportunity_versions(id) on delete restrict,
  scope_declaration text not null,
  scoring_policy_version text,
  computed_score numeric(6,2),
  max_score numeric(6,2) not null check (max_score >= 0),
  submitted_at timestamptz not null,
  materialized_at timestamptz not null,
  unique (questionnaire_submission_id, evidence_record_id),
  check (
    (computed_score is null and scoring_policy_version is null)
    or (computed_score is not null and scoring_policy_version is not null)
  )
);

create table sih26044.application_snapshot_questionnaire_results (
  application_snapshot_id uuid not null
    references sih26044.application_snapshots(id) on delete restrict,
  questionnaire_submission_id uuid not null
    references sih26044.questionnaire_submission_evidence(questionnaire_submission_id) on delete restrict,
  evidence_record_id uuid not null
    references sih26044.evidence_records(id) on delete restrict,
  primary key (application_snapshot_id, questionnaire_submission_id),
  unique (application_snapshot_id, evidence_record_id),
  foreign key (questionnaire_submission_id, evidence_record_id)
    references sih26044.questionnaire_submission_evidence(
      questionnaire_submission_id, evidence_record_id
    ) on delete restrict
);

alter table sih26044.questionnaire_submission_evidence enable row level security;
alter table sih26044.application_snapshot_questionnaire_results enable row level security;

create policy questionnaire_submission_evidence_subject_read
on sih26044.questionnaire_submission_evidence
for select to authenticated
using (respondent_actor_id = sih26044.current_actor_id());

create policy questionnaire_submission_evidence_recruiter_read
on sih26044.questionnaire_submission_evidence
for select to authenticated
using (
  exists (
    select 1
    from sih26044.application_snapshot_questionnaire_results sqr
    join sih26044.application_snapshots snapshot
      on snapshot.id = sqr.application_snapshot_id
    where sqr.questionnaire_submission_id = questionnaire_submission_evidence.questionnaire_submission_id
      and snapshot.finalized_at is not null
      and sih26044.can_recruiter_read_application(snapshot.application_id)
  )
);

create policy application_snapshot_questionnaire_results_subject_or_recruiter_read
on sih26044.application_snapshot_questionnaire_results
for select to authenticated
using (
  exists (
    select 1
    from sih26044.application_snapshots snapshot
    join sih26044.applications application on application.id = snapshot.application_id
    where snapshot.id = application_snapshot_questionnaire_results.application_snapshot_id
      and (
        application.applicant_actor_id = sih26044.current_actor_id()
        or (
          snapshot.finalized_at is not null
          and sih26044.can_recruiter_read_application(application.id)
        )
      )
  )
);

revoke all on sih26044.questionnaire_submission_evidence from public, anon, authenticated;
revoke all on sih26044.application_snapshot_questionnaire_results from public, anon, authenticated;
grant select on sih26044.questionnaire_submission_evidence to authenticated;
grant select on sih26044.application_snapshot_questionnaire_results to authenticated;

create or replace function sih26044.materialize_questionnaire_assessed_evidence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_questionnaire_id uuid;
  v_owner_organization_id uuid;
  v_scope_declaration text;
  v_title text;
  v_max_score numeric;
  v_evidence_id uuid;
  v_materialized_at timestamptz;
begin
  if old.submitted_at is not null or new.submitted_at is null then
    return new;
  end if;

  select version.questionnaire_id, questionnaire.owner_organization_id,
         version.scope_declaration, version.title
  into v_questionnaire_id, v_owner_organization_id, v_scope_declaration, v_title
  from sih26044.questionnaire_versions version
  join sih26044.questionnaires questionnaire on questionnaire.id = version.questionnaire_id
  where version.id = new.questionnaire_version_id;

  select coalesce(sum(question.scoring_weight), 0)
  into v_max_score
  from sih26044.questionnaire_questions question
  where question.questionnaire_version_id = new.questionnaire_version_id
    and question.question_type = 'numeric'
    and question.scoring_weight > 0;

  v_evidence_id := extensions.uuid_generate_v5(
    'd502cb18-3ef5-47ea-a12d-efb38f2876af'::uuid,
    'sih26044:questionnaire-assessed-evidence:' || new.id::text
  );
  v_materialized_at := statement_timestamp();

  insert into sih26044.evidence_records (
    id, subject_actor_id, literal_claim, provenance,
    initial_verification_state, scope_kind, scope_opportunity_id,
    scope_organization_id, source_system, source_record_id,
    source_captured_at, visibility, created_at
  ) values (
    v_evidence_id,
    new.respondent_actor_id,
    format('Completed assessment: %s', v_title),
    'assessed',
    'unverified',
    case when new.opportunity_id is not null then 'opportunity'::sih26044.evidence_scope_kind
         else 'organization'::sih26044.evidence_scope_kind end,
    new.opportunity_id,
    case when new.opportunity_id is null then v_owner_organization_id else null end,
    'careercase_questionnaire',
    new.id::text,
    new.submitted_at,
    'private',
    v_materialized_at
  );

  insert into sih26044.questionnaire_submission_evidence (
    questionnaire_submission_id, evidence_record_id, questionnaire_id,
    questionnaire_version_id, owner_organization_id, respondent_actor_id,
    opportunity_id, opportunity_version_id, scope_declaration,
    scoring_policy_version, computed_score, max_score, submitted_at, materialized_at
  ) values (
    new.id, v_evidence_id, v_questionnaire_id, new.questionnaire_version_id,
    v_owner_organization_id, new.respondent_actor_id, new.opportunity_id,
    new.opportunity_version_id, v_scope_declaration, new.scoring_policy_version,
    new.computed_score, v_max_score, new.submitted_at, v_materialized_at
  );

  return new;
end
$$;

revoke all on function sih26044.materialize_questionnaire_assessed_evidence()
from public, anon, authenticated;

create trigger materialize_questionnaire_assessed_evidence
after update of submitted_at on sih26044.questionnaire_submissions
for each row execute function sih26044.materialize_questionnaire_assessed_evidence();

create or replace function sih26044.bind_snapshot_questionnaire_result()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  insert into sih26044.application_snapshot_questionnaire_results (
    application_snapshot_id, questionnaire_submission_id, evidence_record_id
  )
  select new.application_snapshot_id, mapping.questionnaire_submission_id,
         mapping.evidence_record_id
  from sih26044.questionnaire_submission_evidence mapping
  where mapping.evidence_record_id = new.evidence_record_id
  on conflict do nothing;
  return new;
end
$$;

revoke all on function sih26044.bind_snapshot_questionnaire_result()
from public, anon, authenticated;

create trigger bind_snapshot_questionnaire_result
after insert on sih26044.application_snapshot_evidence
for each row execute function sih26044.bind_snapshot_questionnaire_result();

create trigger protect_application_snapshot_questionnaire_results
before insert or update or delete on sih26044.application_snapshot_questionnaire_results
for each row execute function sih26044.protect_finalized_snapshot_link();

create trigger questionnaire_submission_evidence_immutable
before update or delete on sih26044.questionnaire_submission_evidence
for each row execute function sih26044.reject_historical_mutation();

create or replace function sih26044.application_snapshot_canonical_material(requested_snapshot_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
  select jsonb_build_object(
    'applicationId', s.application_id,
    'opportunityVersionId', s.opportunity_version_id,
    'readinessResultId', s.readiness_result_id,
    'engineVersion', s.engine_version,
    'evidencePolicyVersion', s.evidence_policy_version,
    'inputVersion', s.input_version,
    'subjectFactsVersion', s.subject_facts_version,
    'evidenceProjectionVersion', s.evidence_projection_version,
    'recruiterProjectionVersion', s.recruiter_projection_version,
    'recruiterAllowlistProjection', s.recruiter_allowlist_projection,
    'requirementResponses', s.requirement_responses,
    'evidenceRecordIds', coalesce((
      select jsonb_agg(link.evidence_record_id::text order by link.evidence_record_id::text)
      from sih26044.application_snapshot_evidence link
      where link.application_snapshot_id = s.id
    ), '[]'::jsonb),
    'consentGrantIds', coalesce((
      select jsonb_agg(link.consent_grant_id::text order by link.consent_grant_id::text)
      from sih26044.application_snapshot_consents link
      where link.application_snapshot_id = s.id
    ), '[]'::jsonb),
    'questionnaireResults', coalesce((
      select jsonb_agg(jsonb_build_object(
        'questionnaireSubmissionId', result.questionnaire_submission_id,
        'evidenceRecordId', result.evidence_record_id
      ) order by result.questionnaire_submission_id::text)
      from sih26044.application_snapshot_questionnaire_results result
      where result.application_snapshot_id = s.id
    ), '[]'::jsonb),
    'capturedAt', to_char(s.captured_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  )
  from sih26044.application_snapshots s
  where s.id = requested_snapshot_id
$$;

revoke all on function sih26044.application_snapshot_canonical_material(uuid)
from public, anon, authenticated;
grant execute on function sih26044.application_snapshot_canonical_material(uuid) to service_role;

comment on table sih26044.questionnaire_submission_evidence is
  'Immutable, version-exact mapping from a submitted questionnaire to bounded assessed evidence.';
comment on table sih26044.application_snapshot_questionnaire_results is
  'Exact questionnaire-result bindings captured through selected, consented evidence in an application snapshot.';
