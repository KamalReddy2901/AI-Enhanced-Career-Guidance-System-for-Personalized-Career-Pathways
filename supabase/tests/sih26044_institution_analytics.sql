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

-- Users: six learners, one institution admin, one policy analyst, one unrelated recruiter.
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
  ('21000000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000009', 'Unrelated Recruiter');

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

insert into sih26044.opportunities (id, owner_organization_id, status, created_by_actor_id)
values (
  '51000000-0000-0000-0000-000000000010',
  '31000000-0000-0000-0000-000000000004',
  'published',
  '21000000-0000-0000-0000-000000000009'
);
insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description, opportunity_type,
  audiences, source_system, source_captured_at, source_literal_text,
  created_by_actor_id, published_at
) values (
  '51100000-0000-0000-0000-000000000010',
  '51000000-0000-0000-0000-000000000010',
  1,
  'published',
  'Aggregate Analytics Internship',
  'Controlled aggregate analytics fixture',
  'internship',
  array['student']::sih26044.opportunity_audience[],
  'local_test',
  statement_timestamp(),
  'Controlled aggregate analytics fixture',
  '21000000-0000-0000-0000-000000000009',
  statement_timestamp()
);
update sih26044.opportunities
set current_version_id = '51100000-0000-0000-0000-000000000010'
where id = '51000000-0000-0000-0000-000000000010';

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

insert into sih26044.applications (
  id, applicant_actor_id, opportunity_id, opportunity_version_id, owner_organization_id, initial_stage, created_at
) values
  ('71100000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day'),
  ('71100000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000010', '51100000-0000-0000-0000-000000000010', '31000000-0000-0000-0000-000000000004', 'saved', statement_timestamp() - interval '1 day');

set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000007';
select pg_temp.assert_true(
  (select count(*) = 1 from sih26044.list_authorized_analytics_institutions()
   where organization_id = '31000000-0000-0000-0000-000000000001'),
  'institution admin sees own institution aggregate scope'
);
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.list_authorized_analytics_institutions()
   where organization_id = '31000000-0000-0000-0000-000000000002'),
  'institution admin does not receive unrelated institution aggregate scope'
);

create temp table institution_result as
select sih26044.get_institution_skills_intelligence(
  '31000000-0000-0000-0000-000000000001',
  statement_timestamp() - interval '30 days',
  statement_timestamp()
) as body;

select pg_temp.assert_true(
  (select (body #>> '{query,minimumCohortSize}')::integer = 5 from institution_result),
  'aggregate response exposes the CareerCase minimum reporting cell size'
);
select pg_temp.assert_true(
  (select (body #>> '{cohort,size}')::integer = 6 from institution_result),
  'reportable institution cohort exposes denominator only above threshold'
);
select pg_temp.assert_true(
  (select exists (
    select 1
    from institution_result ir,
      jsonb_array_elements(ir.body->'points') p
    where p->>'metric' = 'readiness_distribution'
      and p #>> '{dimensions,readinessBand}' = 'NEAR_READY'
      and (p->>'value')::integer = 5
      and (p->>'denominator')::integer = 6
      and (p->>'cohortSize')::integer = 5
      and (p->>'suppressed')::boolean = false
  )),
  'reportable readiness cell returns counted value and denominator'
);
select pg_temp.assert_true(
  (select exists (
    select 1
    from institution_result ir,
      jsonb_array_elements(ir.body->'points') p
    where p->>'metric' = 'readiness_distribution'
      and p #>> '{dimensions,readinessBand}' = 'BUILDING_EVIDENCE'
      and p->'value' = 'null'::jsonb
      and p->'denominator' = 'null'::jsonb
      and p->'cohortSize' = 'null'::jsonb
      and (p->>'suppressed')::boolean = true
      and p->>'suppressionReason' = 'below_minimum_cell_size'
  )),
  'small readiness cell is suppressed without leaking exact numerator or denominator'
);
select pg_temp.assert_true(
  (select exists (
    select 1
    from institution_result ir,
      jsonb_array_elements(ir.body->'points') p
    where p->>'metric' = 'requirement_pattern'
      and p #>> '{dimensions,requirementLabel}' = 'SQL Querying'
      and (p->>'value')::integer = 6
      and (p->>'suppressed')::boolean = false
  )),
  'dynamic requirement pattern appears only when reportable cohort threshold is met'
);
select pg_temp.assert_true(
  (select body->>'methodologyVersion' = 'institution-skills-intelligence-v1'
      and body->>'sourceLabel' like 'CareerCase SIH26044 tenant records%'
      and body->>'scopeNote' like '%not a national labour-market estimate%'
   from institution_result),
  'aggregate response carries methodology, source and non-national-demand scope labels'
);
select pg_temp.assert_true(
  (select body::text !~* 'riasec|work_?values|private_?aspirations|counselor_?history|hiring_probability|candidate_rank'
   from institution_result),
  'aggregate response excludes private guidance and prohibited hiring keys'
);
select pg_temp.assert_true(
  (select body::text !~ '21000000-0000-0000-0000-00000000000[1-6]'
   from institution_result),
  'aggregate response contains no learner actor identifiers'
);
select pg_temp.assert_blocked(
  $sql$select sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000002',
    statement_timestamp() - interval '30 days',
    statement_timestamp()
  )$sql$,
  'institution admin cannot query an unrelated institution aggregate'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000008';
select pg_temp.assert_true(
  (select count(*) = 2 from sih26044.list_authorized_analytics_institutions()),
  'authorized government policy analyst receives de-identified institution aggregate scopes'
);
select pg_temp.assert_true(
  sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp()
  ) #>> '{accessMode}' = 'policy_program_analyst',
  'policy analyst can query only the aggregate RPC boundary'
);
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.opportunity_readiness_results),
  'policy analyst still cannot read individual readiness rows'
);
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.applications),
  'policy analyst still cannot read individual application rows'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000009';
select pg_temp.assert_true(
  (select count(*) = 0 from sih26044.list_authorized_analytics_institutions()),
  'recruiter receives no institution aggregate scope by role alone'
);
select pg_temp.assert_blocked(
  $sql$select sih26044.get_institution_skills_intelligence(
    '31000000-0000-0000-0000-000000000001',
    statement_timestamp() - interval '30 days',
    statement_timestamp()
  )$sql$,
  'unrelated recruiter cannot query institution aggregate intelligence'
);
reset role;

select pg_temp.assert_true(
  (select count(*) >= 2
   from sih26044.audit_events
   where action = 'analytics.institution_aggregate_viewed'
     and organization_id = '31000000-0000-0000-0000-000000000001'
     and purpose = 'aggregate_analytics'),
  'aggregate query definitions are recorded in authoritative audit history'
);

rollback;
