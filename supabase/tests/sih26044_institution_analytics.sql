-- Executable SIH26044 institution/policy aggregate analytics assertions.
-- Run after all migrations on a disposable local database. Transactional.

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

create or replace function pg_temp.assert_blocked(command text, message text)
returns void language plpgsql as $$
declare
  affected_rows bigint := 0;
  blocked boolean := false;
begin
  begin
    execute command;
    get diagnostics affected_rows = row_count;
    blocked := affected_rows = 0;
  exception when others then
    blocked := true;
  end;
  if not blocked then raise exception 'ASSERTION FAILED: %', message; end if;
end
$$;

-- Six learners, one institution admin, one government policy analyst, and one recruiter.
insert into auth.users (id) values
  ('11000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000003'),
  ('11000000-0000-0000-0000-000000000004'),
  ('11000000-0000-0000-0000-000000000005'),
  ('11000000-0000-0000-0000-000000000006'),
  ('11000000-0000-0000-0000-000000000007'),
  ('11000000-0000-0000-0000-000000000008'),
  ('11000000-0000-0000-0000-000000000009')
on conflict (id) do nothing;

insert into sih26044.actors (id, auth_user_id, display_name) values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Cohort Learner 1'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Cohort Learner 2'),
  ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000003', 'Cohort Learner 3'),
  ('21000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', 'Cohort Learner 4'),
  ('21000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000005', 'Cohort Learner 5'),
  ('21000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000006', 'Cohort Learner 6'),
  ('21000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000007', 'Institution Analyst'),
  ('21000000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000008', 'Policy Analyst'),
  ('21000000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000009', 'Human Recruiter');

insert into sih26044.organizations (id, legal_name, display_name, kind) values
  ('31000000-0000-0000-0000-000000000001', 'Aggregate Test Institute', 'Aggregate Test Institute', 'educational_institution'),
  ('31000000-0000-0000-0000-000000000002', 'Other Aggregate Institute', 'Other Aggregate Institute', 'educational_institution'),
  ('31000000-0000-0000-0000-000000000003', 'Aggregate Policy Office', 'Aggregate Policy Office', 'government'),
  ('31000000-0000-0000-0000-000000000004', 'Aggregate Employer Pvt Ltd', 'Aggregate Employer', 'employer');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status) values
  ('41000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000006', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000007', '31000000-0000-0000-0000-000000000001', 'active'),
  ('41000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000008', '31000000-0000-0000-0000-000000000003', 'active'),
  ('41000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-000000000009', '31000000-0000-0000-0000-000000000004', 'active');

insert into sih26044.organization_membership_roles (membership_id, role) values
  ('41000000-0000-0000-0000-000000000001', 'learner'),
  ('41000000-0000-0000-0000-000000000002', 'learner'),
  ('41000000-0000-0000-0000-000000000003', 'learner'),
  ('41000000-0000-0000-0000-000000000004', 'learner'),
  ('41000000-0000-0000-0000-000000000005', 'learner'),
  ('41000000-0000-0000-0000-000000000006', 'learner'),
  ('41000000-0000-0000-0000-000000000007', 'institution_admin'),
  ('41000000-0000-0000-0000-000000000008', 'policy_program_analyst'),
  ('41000000-0000-0000-0000-000000000009', 'recruiter');

-- Author the opportunity as a draft. Requirements must exist before publication.
insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values (
  '51000000-0000-0000-0000-000000000010',
  '31000000-0000-0000-0000-000000000004',
  'draft',
  '21000000-0000-0000-0000-000000000009'
);

insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text, created_by_actor_id
) values (
  '51100000-0000-0000-0000-000000000010',
  '51000000-0000-0000-0000-000000000010',
  1,
  'draft',
  'Aggregate Analytics Internship',
  'Controlled aggregate analytics fixture',
  'internship',
  array['student']::sih26044.opportunity_audience[],
  'local_test',
  statement_timestamp(),
  'Controlled aggregate analytics fixture',
  '21000000-0000-0000-0000-000000000009'
);

insert into sih26044.opportunity_requirements (
  id, opportunity_version_id, ordinal, category, priority, literal_source_wording,
  importance, evidence_expectation, hard_gate, canonical_resolution,
  canonical_skill_id, canonical_skill_label, human_confirmed,
  confirmed_by_actor_id, confirmed_at, confirmation_method,
  resolution_status, resolution_suggestions
) values (
  '52100000-0000-0000-0000-000000000010',
  '51100000-0000-0000-0000-000000000010',
  0,
  'skill',
  'required',
  'SQL querying',
  3,
  'artifact_expected',
  false,
  'exact',
  'sql-querying',
  'SQL Querying',
  true,
  '21000000-0000-0000-0000-000000000009',
  statement_timestamp(),
  'structured_human_entry',
  'resolved',
  '[]'::jsonb
);

-- Publish only through the explicit authenticated human boundary.
set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000009';
select pg_temp.assert_true(
  sih26044.publish_opportunity_version('51100000-0000-0000-0000-000000000010')
    = '51100000-0000-0000-0000-000000000010'::uuid,
  'human recruiter can publish the fully confirmed draft fixture'
);
reset role;

select pg_temp.assert_true(
  exists (
    select 1
    from sih26044.opportunity_versions
    where id = '51100000-0000-0000-0000-000000000010'
      and status = 'published'
      and published_at is not null
  ),
  'fixture publication must use the immutable production lifecycle'
);

-- Five learners form a reportable readiness cell; one creates a suppressed cell.
insert into sih26044.opportunity_readiness_results (
  id, subject_actor_id, opportunity_id, opportunity_version_id,
  engine_version, evidence_policy_version, input_version,
  subject_facts_version, evidence_projection_version,
  readiness_band, result_body, generated_at
) values
  ('61100000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', 'engine-test', 'policy-test', 'input-1', 'facts-1', 'projection-1', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('61100000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', 'engine-test', 'policy-test', 'input-2', 'facts-2', 'projection-2', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('61100000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', 'engine-test', 'policy-test', 'input-3', 'facts-3', 'projection-3', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('61100000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', 'engine-test', 'policy-test', 'input-4', 'facts-4', 'projection-4', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('61100000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', 'engine-test', 'policy-test', 'input-5', 'facts-5', 'projection-5', 'NEAR_READY', '{"eligibilityStatus":"ELIGIBLE","requiredRequirementResults":[{"state":"MET_WEAK_EVIDENCE"}]}'::jsonb, statement_timestamp() - interval '2 days'),
  ('61100000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', 'engine-test', 'policy-test', 'input-6', 'facts-6', 'projection-6', 'BUILDING_EVIDENCE', '{"eligibilityStatus":"NEEDS_REVIEW","requiredRequirementResults":[{"state":"GAP"}]}'::jsonb, statement_timestamp() - interval '2 days');

-- Six applications provide a reportable application-funnel cell and requirement pattern.
insert into sih26044.applications (
  id, applicant_actor_id, opportunity_id, opportunity_version_id, owner_organization_id, initial_stage, created_at
) values
  ('71100000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day');

-- One individual evidence row makes raw-row denial tests meaningful rather than vacuous.
insert into sih26044.evidence_records (
  id, subject_actor_id, literal_claim, provenance, initial_verification_state,
  scope_kind, scope_literal_skill_label, source_system, source_captured_at, visibility
) values (
  '81100000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'Can write SQL queries',
  'self_reported',
  'unverified',
  'global_skill',
  'SQL querying',
  'local_test',
  statement_timestamp() - interval '3 days',
  'private'
);

-- Institution admin: own institution is listed and aggregate access is allowed.
set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000007';
select pg_temp.assert_true(
  exists (
    select 1 from sih26044.list_authorized_analytics_institutions()
    where organization_id = '31000000-0000-0000-0000-000000000001'
      and access_mode = 'institution_admin'
  ),
  'institution admin can list its authorized institution aggregate scope'
);
select pg_temp.assert_true(
  (sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp() + interval '1 hour'
  ) ->> 'accessMode') = 'institution_admin',
  'institution admin can call the aggregate-only Skills Intelligence RPC'
);
select pg_temp.assert_true(
  (
    jsonb_path_query_first(
      sih26044.get_institution_skills_intelligence(
        '31000000-0000-0000-0000-000000000001',
        statement_timestamp() - interval '30 days',
        statement_timestamp() + interval '1 hour'
      ),
      '$.points[*] ? (@.metric == "readiness_distribution" && @.dimensions.readinessBand == "NEAR_READY")'
    ) ->> 'value'
  )::integer = 5,
  'five-person NEAR_READY cell is reportable'
);
select pg_temp.assert_true(
  jsonb_path_query_first(
    sih26044.get_institution_skills_intelligence(
      '31000000-0000-0000-0000-000000000001',
      statement_timestamp() - interval '30 days',
      statement_timestamp() + interval '1 hour'
    ),
    '$.points[*] ? (@.metric == "readiness_distribution" && @.dimensions.readinessBand == "BUILDING_EVIDENCE")'
  ) @> '{"suppressed":true,"value":null,"denominator":null,"cohortSize":null,"suppressionReason":"below_minimum_cell_size"}'::jsonb,
  'singleton readiness cell is structurally suppressed without exact counts'
);
select pg_temp.assert_true(
  (
    jsonb_path_query_first(
      sih26044.get_institution_skills_intelligence(
        '31000000-0000-0000-0000-000000000001',
        statement_timestamp() - interval '30 days',
        statement_timestamp() + interval '1 hour'
      ),
      '$.points[*] ? (@.metric == "application_funnel" && @.dimensions.stage == "saved")'
    ) ->> 'value'
  )::integer = 6,
  'six-person saved application funnel cell is reportable'
);
select pg_temp.assert_true(
  (
    jsonb_path_query_first(
      sih26044.get_institution_skills_intelligence(
        '31000000-0000-0000-0000-000000000001',
        statement_timestamp() - interval '30 days',
        statement_timestamp() + interval '1 hour'
      ),
      '$.points[*] ? (@.metric == "requirement_pattern" && @.dimensions.requirementLabel == "SQL Querying")'
    ) ->> 'value'
  )::integer = 6,
  'requirement pattern is reported only from an adequately sized applicant cohort'
);
select pg_temp.assert_true(
  not sih26044.has_prohibited_json_keys(
    sih26044.get_institution_skills_intelligence(
      '31000000-0000-0000-0000-000000000001',
      statement_timestamp() - interval '30 days',
      statement_timestamp() + interval '1 hour'
    )
  ),
  'aggregate result contains no prohibited private guidance or high-stakes keys'
);
select pg_temp.assert_true(
  sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp() + interval '1 hour'
  )::text not like '%21000000-0000-0000-0000-000000000001%',
  'aggregate result does not expose learner identifiers'
);
select pg_temp.assert_true(
  not jsonb_path_exists(
    sih26044.get_institution_skills_intelligence(
      '31000000-0000-0000-0000-000000000001',
      statement_timestamp() - interval '30 days',
      statement_timestamp() + interval '1 hour'
    ),
    '$.points[*] ? (@.causalClaimed != false)'
  ),
  'all aggregate points remain explicitly non-causal'
);
select pg_temp.assert_blocked(
  $$select * from sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000002',
    statement_timestamp() - interval '30 days',
    statement_timestamp() + interval '1 hour'
  )$$,
  'institution admin cannot read another institution aggregate without authority'
);
reset role;

-- Government policy/program analyst: aggregate-only access across institutions, never individual rows.
set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000008';
select pg_temp.assert_true(
  exists (
    select 1 from sih26044.list_authorized_analytics_institutions()
    where organization_id = '31000000-0000-0000-0000-000000000001'
      and access_mode = 'policy_program_analyst'
  ),
  'authorized government policy analyst can list educational-institution aggregate scopes'
);
select pg_temp.assert_true(
  (sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp() + interval '1 hour'
  ) ->> 'accessMode') = 'policy_program_analyst',
  'policy analyst can read the same privacy-protected aggregate contract'
);
select pg_temp.assert_blocked(
  'select id from sih26044.evidence_records',
  'policy analyst cannot read individual evidence rows'
);
select pg_temp.assert_blocked(
  'select id from sih26044.opportunity_readiness_results',
  'policy analyst cannot read individual readiness rows'
);
select pg_temp.assert_blocked(
  'select id from sih26044.applications',
  'policy analyst cannot read individual application rows'
);
reset role;

-- A recruiter has no institution aggregate authority.
set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000009';
select pg_temp.assert_blocked(
  $$select * from sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp() + interval '1 hour'
  )$$,
  'recruiter cannot call institution aggregate analytics'
);
reset role;

-- Aggregate reads are auditable without storing learner-level payloads.
select pg_temp.assert_true(
  exists (
    select 1
    from sih26044.audit_events
    where action = 'analytics.institution_aggregate_viewed'
      and organization_id = '31000000-0000-0000-0000-000000000001'
      and purpose = 'aggregate_analytics'
  ),
  'institution aggregate reads create authoritative audit events'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from sih26044.audit_events
    where action = 'analytics.institution_aggregate_viewed'
      and metadata::text ~* '(subjectActorId|evidenceRecordId|applicationId|riasec|work_values|private_aspirations)'
  ),
  'aggregate analytics audit metadata remains minimized and contains no individual/private payload'
);

rollback;
