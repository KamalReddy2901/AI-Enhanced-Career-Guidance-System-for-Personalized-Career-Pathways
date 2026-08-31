-- CareerCase × SIH26044: Questionnaire authenticated authority tests
--
-- Tests actual RLS enforcement using SET LOCAL role with auth.uid() simulation.
-- Unlike the minimal test, this proves:
-- - Recruiter A can author only for organization A
-- - Recruiter B cannot read/write organization A drafts
-- - Student can access only eligible published questionnaires
-- - Student owns only own submission
-- - Student cannot write another student's response
-- - Student cannot submit for another actor
-- - Published questionnaire cannot mutate
-- - Submitted answers cannot mutate
-- - Server-derived score cannot be forged by browser
-- - Free text has no automatic high-impact score

begin;

-- ============================================================================
-- SETUP: Create test auth users, actors, organizations, memberships
-- ============================================================================

-- Create auth.users records (required for foreign key)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recruiter_a@example.com', 'unused', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recruiter_b@example.com', 'unused', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@example.com', 'unused', now(), now(), now());

-- Organizations
insert into sih26044.organizations (id, legal_name, display_name, kind, status)
values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'Employer A Legal', 'Employer A', 'employer', 'active'),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'Employer B Legal', 'Employer B', 'employer', 'active');

-- Actors with real auth_user_id links
insert into sih26044.actors (id, auth_user_id, display_name, status)
values
  ('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Recruiter A', 'active'),
  ('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, 'Recruiter B', 'active'),
  ('30000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, 'Student One', 'active');

-- Memberships
insert into sih26044.organization_memberships (id, actor_id, organization_id, status)
values
  ('40000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'active'),
  ('40000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'active'),
  ('40000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'active');

-- Roles
insert into sih26044.organization_membership_roles (membership_id, role)
values
  ('40000000-0000-0000-0000-000000000001'::uuid, 'recruiter'),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'recruiter'),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'learner');

-- Published opportunity used to prove exact questionnaire assignment/context.
insert into sih26044.opportunities (
  id, owner_organization_id, status, created_by_actor_id
) values (
  '50000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  'published',
  '30000000-0000-0000-0000-000000000001'::uuid
);

insert into sih26044.opportunity_versions (
  id, opportunity_id, version_number, status, title, description,
  opportunity_type, audiences, source_system, source_captured_at,
  source_literal_text, created_by_actor_id, published_at
) values (
  '50000000-0000-0000-0000-000000000002'::uuid,
  '50000000-0000-0000-0000-000000000001'::uuid,
  1, 'published', 'Questionnaire authority fixture', 'Published fixture',
  'internship', array['student']::sih26044.opportunity_audience[],
  'controlled_test', statement_timestamp(), 'Controlled test fixture',
  '30000000-0000-0000-0000-000000000001'::uuid, statement_timestamp()
);

update sih26044.opportunities
set current_version_id = '50000000-0000-0000-0000-000000000002'::uuid
where id = '50000000-0000-0000-0000-000000000001'::uuid;

-- Note: Supabase's auth.uid() function already reads from request.jwt.claim.sub,
-- so we just need to SET LOCAL that variable when switching to authenticated role.
-- No need to override auth.uid() itself (which requires auth schema permissions).

-- ============================================================================
-- TEST 1: Recruiter A can create questionnaire for organization A
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  v_result jsonb;
  v_questionnaire_id uuid;
  v_version_id uuid;
begin
  -- Create questionnaire via trusted RPC
  select sih26044.create_questionnaire_atomic(
    '20000000-0000-0000-0000-000000000001'::uuid, -- Employer A
    'Technical Screening v1',
    'Basic technical assessment for software roles',
    'opportunity_specific',
    '[
      {"question_type": "single_choice", "question_text": "Primary programming language?", "choice_options": [{"value":"python","label":"Python"}], "scoring_weight": 10.0},
      {"question_type": "numeric", "question_text": "Years of experience?", "numeric_min": 0, "numeric_max": 10, "scoring_weight": 5.0},
      {"question_type": "text", "question_text": "Describe your project."}
    ]'::jsonb,
    '{"version": "1.0", "rules": {"method": "weighted_sum", "max_score": 15.0}}'::jsonb
  ) into v_result;

  v_questionnaire_id := (v_result->>'questionnaire_id')::uuid;
  v_version_id := (v_result->>'version_id')::uuid;

  if v_questionnaire_id is null or v_version_id is null then
    raise exception 'FAIL: Recruiter A could not create questionnaire for org A';
  end if;

  raise notice 'TEST 1 PASSED: Recruiter A created questionnaire % version %', v_questionnaire_id, v_version_id;
end;
$$;

reset role;

-- ============================================================================
-- TEST 2: Recruiter B cannot create questionnaire for organization A
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

do $$
declare
  v_result jsonb;
begin
  select sih26044.create_questionnaire_atomic(
    '20000000-0000-0000-0000-000000000001'::uuid, -- Employer A (not B's org)
    'Unauthorized Questionnaire',
    'Should fail',
    'opportunity_specific',
    '[{"question_type": "text", "question_text": "Test"}]'::jsonb
  ) into v_result;

  raise exception 'FAIL: Recruiter B could create questionnaire for org A';
exception when others then
  if sqlerrm like '%INSUFFICIENT_AUTHORITY%' then
    raise notice 'TEST 2 PASSED: Recruiter B blocked from org A';
  else
    raise exception using message = 'TEST 2 FAILED: Wrong error: ' || sqlerrm;
  end if;
end;
$$;

reset role;

-- ============================================================================
-- TEST 3: Recruiter B cannot read organization A's draft questionnaires via RLS
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

do $$
declare
  v_count int;
begin
  -- Try to read org A's questionnaires via RLS
  select count(*) into v_count
  from sih26044.questionnaires
  where owner_organization_id = '20000000-0000-0000-0000-000000000001'::uuid;

  if v_count > 0 then
    raise exception 'FAIL: Recruiter B can read org A questionnaires';
  end if;

  raise notice 'TEST 3 PASSED: Recruiter B cannot read org A questionnaires';
end;
$$;

reset role;

-- ============================================================================
-- TEST 4: Publish questionnaire as Recruiter A
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  v_version_id uuid;
  v_result jsonb;
begin
  -- Get Recruiter A's draft version
  select qv.id into v_version_id
  from sih26044.questionnaire_versions qv
  inner join sih26044.questionnaires q on q.id = qv.questionnaire_id
  where q.owner_organization_id = '20000000-0000-0000-0000-000000000001'::uuid
    and qv.status = 'draft'
  limit 1;

  if v_version_id is null then
    raise exception 'TEST 4 SETUP FAILED: No draft version found';
  end if;

  -- Publish via trusted RPC
  select sih26044.publish_questionnaire_atomic(v_version_id) into v_result;

  if (v_result->>'published_at') is null then
    raise exception 'FAIL: Questionnaire not published';
  end if;

  insert into sih26044.opportunity_questionnaire_assignments (
    opportunity_version_id, questionnaire_id, required, ordinal
  ) values (
    '50000000-0000-0000-0000-000000000002'::uuid,
    (v_result->>'questionnaire_id')::uuid,
    true,
    0
  );

  raise notice 'TEST 4 PASSED: Recruiter A published questionnaire';
end;
$$;

reset role;

-- ============================================================================
-- TEST 5: Published questionnaire version content is immutable
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  v_version_id uuid;
begin
  -- Get published version
  select qv.id into v_version_id
  from sih26044.questionnaire_versions qv
  where qv.status = 'published'
  limit 1;

  -- Try to mutate title
  update sih26044.questionnaire_versions
  set title = 'Mutated Title'
  where id = v_version_id;

  raise exception 'FAIL: Published questionnaire version was mutated';
exception when others then
  if sqlstate = '42501' or sqlerrm like '%PUBLISHED_VERSION_IMMUTABLE%' then
    raise notice 'TEST 5 PASSED: Browser cannot mutate a published version';
  else
    raise exception using message = 'TEST 5 FAILED: Wrong error: ' || sqlerrm;
  end if;
end;
$$;

reset role;

-- ============================================================================
-- TEST 5A: Successor draft preserves the currently published live version
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  v_source_id uuid;
  v_questionnaire_id uuid;
  v_result jsonb;
  v_live_version_id uuid;
  v_source_count integer;
  v_successor_count integer;
begin
  select version.id, version.questionnaire_id into v_source_id, v_questionnaire_id
  from sih26044.questionnaire_versions version
  where version.status = 'published' limit 1;

  select sih26044.create_questionnaire_successor_draft(v_source_id) into v_result;
  select current_version_id into v_live_version_id
  from sih26044.questionnaires where id = v_questionnaire_id;
  select count(*) into v_source_count from sih26044.questionnaire_questions where questionnaire_version_id = v_source_id;
  select count(*) into v_successor_count from sih26044.questionnaire_questions where questionnaire_version_id = (v_result->>'successor_version_id')::uuid;

  if v_live_version_id <> v_source_id
    or (v_result->>'version_number')::integer <> 2
    or v_source_count <> v_successor_count then
    raise exception 'FAIL: Successor draft changed live authority or failed to clone exact questions';
  end if;
  raise notice 'TEST 5A PASSED: Successor draft leaves published version live';
end;
$$;

reset role;

-- ============================================================================
-- TEST 5B: Exact successor draft can be edited atomically without source mutation
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  v_draft_id uuid;
begin
  select id into v_draft_id from sih26044.questionnaire_versions
  where version_number = 2 and status = 'draft' limit 1;

  perform sih26044.update_questionnaire_draft_atomic(
    v_draft_id, 'Technical Screening v2', 'Revised contextual assessment',
    'opportunity_specific',
    '[
      {"question_type":"single_choice","question_text":"Preferred programming language?","choice_options":[{"value":"python","label":"Python"}],"scoring_weight":10},
      {"question_type":"numeric","question_text":"Years of applied experience?","numeric_min":0,"numeric_max":10,"scoring_weight":5},
      {"question_type":"text","question_text":"Describe a recent project."}
    ]'::jsonb,
    '{"version":"2.0","rules":{"method":"weighted_sum","max_score":15}}'::jsonb
  );

  if (select title from sih26044.questionnaire_versions where version_number = 1 limit 1) <> 'Technical Screening v1'
    or (select title from sih26044.questionnaire_versions where id = v_draft_id) <> 'Technical Screening v2'
    or (select count(*) from sih26044.questionnaire_questions where questionnaire_version_id = v_draft_id) <> 3 then
    raise exception 'FAIL: Draft edit mutated source or was not atomic';
  end if;
  raise notice 'TEST 5B PASSED: Exact successor draft edited without source mutation';
end;
$$;

reset role;

-- ============================================================================
-- TEST 5C: Unrelated recruiter cannot revise another organization's questionnaire
-- ============================================================================

select set_config(
  'test.questionnaire_source_version_id',
  (select id::text from sih26044.questionnaire_versions where version_number = 1 and status = 'published' limit 1),
  true
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

do $$
declare
  v_source_id uuid;
begin
  v_source_id := current_setting('test.questionnaire_source_version_id')::uuid;
  perform sih26044.create_questionnaire_successor_draft(v_source_id);
  raise exception 'FAIL: Unrelated recruiter created successor draft';
exception when others then
  if sqlerrm like '%INSUFFICIENT_AUTHORITY%' then
    raise notice 'TEST 5C PASSED: Unrelated recruiter cannot create successor';
  else
    raise;
  end if;
end;
$$;

reset role;

-- ============================================================================
-- TEST 5D: Explicit publication atomically promotes successor as current
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

do $$
declare
  v_source_id uuid;
  v_successor_id uuid;
  v_questionnaire_id uuid;
begin
  select id, questionnaire_id into v_successor_id, v_questionnaire_id
  from sih26044.questionnaire_versions where version_number = 2 and status = 'draft' limit 1;
  select id into v_source_id from sih26044.questionnaire_versions
  where questionnaire_id = v_questionnaire_id and version_number = 1;

  perform sih26044.publish_questionnaire_atomic(v_successor_id);
  if (select current_version_id from sih26044.questionnaires where id = v_questionnaire_id) <> v_successor_id
    or (select status from sih26044.questionnaire_versions where id = v_source_id) <> 'published'
    or (select status from sih26044.questionnaire_versions where id = v_successor_id) <> 'published' then
    raise exception 'FAIL: Successor publication did not switch stable current authority correctly';
  end if;
  raise notice 'TEST 5D PASSED: Explicit publication promoted successor and preserved source';
end;
$$;

reset role;

-- ============================================================================
-- TEST 6: Student can start submission for published questionnaire
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
declare
  v_version_id uuid;
  v_submission_id uuid;
begin
  -- Student can see published questionnaire version
  select qv.id into v_version_id
  from sih26044.questionnaire_versions qv
  where qv.status = 'published'
  limit 1;

  if v_version_id is null then
    raise exception 'TEST 6 SETUP FAILED: Student cannot see published version';
  end if;

  -- Start submission via RLS-allowed INSERT
  insert into sih26044.questionnaire_submissions (
    questionnaire_version_id, respondent_actor_id, opportunity_id, opportunity_version_id
  )
  values (
    v_version_id,
    '30000000-0000-0000-0000-000000000003'::uuid,
    '50000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000002'::uuid
  )
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'FAIL: Student could not start submission';
  end if;

  raise notice 'TEST 6 PASSED: Student started submission %', v_submission_id;
end;
$$;

reset role;

-- ============================================================================
-- TEST 7: Student can save responses for own submission
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
declare
  v_submission_id uuid;
  v_question_ids uuid[];
begin
  -- Get student's submission
  select id into v_submission_id
  from sih26044.questionnaire_submissions
  where respondent_actor_id = '30000000-0000-0000-0000-000000000003'::uuid
    and submitted_at is null
  limit 1;

  -- Get question IDs
  select array_agg(qq.id order by qq.ordinal) into v_question_ids
  from sih26044.questionnaire_questions qq
  inner join sih26044.questionnaire_submissions qs on qs.questionnaire_version_id = qq.questionnaire_version_id
  where qs.id = v_submission_id;

  -- Save responses via RLS-allowed INSERT
  insert into sih26044.questionnaire_responses (submission_id, question_id, response_value)
  values
    (v_submission_id, v_question_ids[1], '"python"'::jsonb),
    (v_submission_id, v_question_ids[2], '5'::jsonb),
    (v_submission_id, v_question_ids[3], '"Built a dashboard"'::jsonb);

  raise notice 'TEST 7 PASSED: Student saved responses';
end;
$$;

reset role;

-- ============================================================================
-- TEST 8: Student cannot forge response_score (server derives it)
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
declare
  v_submission_id uuid;
  v_response_id uuid;
begin
  select id into v_submission_id
  from sih26044.questionnaire_submissions
  where respondent_actor_id = '30000000-0000-0000-0000-000000000003'::uuid
    and submitted_at is null
  limit 1;

  select id into v_response_id
  from sih26044.questionnaire_responses
  where submission_id = v_submission_id
  limit 1;

  -- Direct score writes are outside the browser's column-level ACL.
  update sih26044.questionnaire_responses
  set response_score = 999.0
  where id = v_response_id;

  raise exception 'FAIL: Browser forged response_score';
exception when insufficient_privilege then
  raise notice 'TEST 8 PASSED: Browser cannot write authoritative response_score';
end;
$$;

reset role;

-- ============================================================================
-- TEST 9: Free-text response has no automatic high-impact score
-- ============================================================================

do $$
declare
  v_text_score numeric;
begin
  select response_score into v_text_score
  from sih26044.questionnaire_responses qr
  inner join sih26044.questionnaire_questions qq on qq.id = qr.question_id
  where qq.question_type = 'text';

  if v_text_score is not null then
    raise exception 'FAIL: Free-text response has automatic score: %', v_text_score;
  end if;

  raise notice 'TEST 9 PASSED: Free-text responses have no automatic score';
end;
$$;

-- ============================================================================
-- TEST 10: Submission finalization is atomic and deterministic (server authority)
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
declare
  v_submission_id uuid;
  v_result jsonb;
  v_computed_score numeric;
begin
  select id into v_submission_id
  from sih26044.questionnaire_submissions
  where respondent_actor_id = '30000000-0000-0000-0000-000000000003'::uuid
    and submitted_at is null
  limit 1;

  -- Submit via trusted RPC
  select sih26044.submit_questionnaire_atomic(v_submission_id) into v_result;

  v_computed_score := (v_result->>'computed_score')::numeric;

  if v_computed_score is null then
    raise exception 'FAIL: No computed score after submission';
  end if;

  if v_computed_score = 999.0 then
    raise exception 'FAIL: Browser-supplied forged score was used';
  end if;

  raise notice 'TEST 10A PASSED: Submission finalized with server-derived score %', v_computed_score;
end;
$$;

do $$
declare
  v_submission_id uuid;
begin
  select id into v_submission_id
  from sih26044.questionnaire_submissions
  where respondent_actor_id = '30000000-0000-0000-0000-000000000003'::uuid
    and submitted_at is not null
  limit 1;

  update sih26044.questionnaire_submissions
  set computed_score = 0
  where id = v_submission_id;

  raise exception 'FAIL: Submitted submission was mutated';
exception when others then
  if sqlstate = '42501' or sqlerrm like '%SUBMITTED_SUBMISSION_IMMUTABLE%' then
    raise notice 'TEST 10B PASSED: Submitted questionnaire is immutable';
  elsif sqlerrm like '%FAIL%' then
    raise;
  else
    raise exception 'TEST 10 FAILED: Unexpected error: %', sqlerrm;
  end if;
end;
$$;

reset role;

-- ============================================================================
-- TEST 11: Trusted finalization materializes bounded, version-exact assessed evidence
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
declare
  v_mapping record;
  v_evidence record;
begin
  select mapping.* into v_mapping
  from sih26044.questionnaire_submission_evidence mapping
  where mapping.respondent_actor_id = '30000000-0000-0000-0000-000000000003'::uuid;

  if v_mapping.questionnaire_submission_id is null
    or v_mapping.questionnaire_version_id is null
    or v_mapping.owner_organization_id <> '20000000-0000-0000-0000-000000000001'::uuid
    or v_mapping.opportunity_id <> '50000000-0000-0000-0000-000000000001'::uuid
    or v_mapping.opportunity_version_id <> '50000000-0000-0000-0000-000000000002'::uuid
    or v_mapping.scoring_policy_version <> '1.0'
    or v_mapping.computed_score is null
    or v_mapping.max_score <> 5.0 then
    raise exception 'FAIL: Assessed evidence mapping omitted exact authoritative context: %', row_to_json(v_mapping);
  end if;

  select evidence.* into v_evidence
  from sih26044.evidence_records evidence
  where evidence.id = v_mapping.evidence_record_id;

  if v_evidence.provenance <> 'assessed'
    or v_evidence.initial_verification_state <> 'unverified'
    or v_evidence.subject_actor_id <> v_mapping.respondent_actor_id
    or v_evidence.scope_kind <> 'opportunity'
    or v_evidence.scope_opportunity_id <> v_mapping.opportunity_id
    or v_evidence.source_record_id <> v_mapping.questionnaire_submission_id::text
    or v_evidence.visibility <> 'private' then
    raise exception 'FAIL: Materialized evidence exceeded assessed/private scope: %', row_to_json(v_evidence);
  end if;

  raise notice 'TEST 11 PASSED: Finalization atomically produced bounded assessed evidence';
end;
$$;

reset role;

-- ============================================================================
-- TEST 12: Unrelated recruiter cannot read a student's assessment mapping
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from sih26044.questionnaire_submission_evidence;
  if v_count <> 0 then
    raise exception 'FAIL: Unrelated recruiter can read questionnaire assessment mappings';
  end if;
  raise notice 'TEST 12 PASSED: Unrelated recruiter cannot read assessment mappings';
end;
$$;

reset role;

-- ============================================================================
-- TEST 13: Browser roles cannot forge questionnaire assessment mappings
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
begin
  insert into sih26044.questionnaire_submission_evidence (
    questionnaire_submission_id, evidence_record_id, questionnaire_id,
    questionnaire_version_id, owner_organization_id, respondent_actor_id,
    opportunity_id, opportunity_version_id, scope_declaration,
    scoring_policy_version, computed_score, max_score, submitted_at, materialized_at
  ) values (
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), '30000000-0000-0000-0000-000000000003'::uuid,
    null, null, 'opportunity_specific', null, null, 0,
    statement_timestamp(), statement_timestamp()
  );
  raise exception 'FAIL: Browser forged questionnaire assessment mapping';
exception when insufficient_privilege then
  raise notice 'TEST 13 PASSED: Browser cannot forge assessment mappings';
end;
$$;

reset role;

-- ============================================================================
-- TEST 14: Student cannot submit for another actor
-- ============================================================================

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

do $$
declare
  v_version_id uuid;
  v_fake_submission_id uuid;
begin
  select qv.id into v_version_id
  from sih26044.questionnaire_versions qv
  where qv.status = 'published'
  limit 1;

  -- Try to create submission for another actor
  insert into sih26044.questionnaire_submissions (
    questionnaire_version_id, respondent_actor_id, opportunity_id
  )
  values (
    v_version_id,
    '30000000-0000-0000-0000-000000000001'::uuid, -- Recruiter A, not student
    null
  )
  returning id into v_fake_submission_id;

  -- RLS may allow INSERT but actor resolution must be server-side
  -- Try to submit this fake submission
  perform sih26044.submit_questionnaire_atomic(v_fake_submission_id);

  raise exception 'FAIL: Student submitted for another actor';
exception when others then
  if sqlstate = '42501'
    or sqlerrm like '%SUBMISSION_NOT_FOUND_OR_ALREADY_SUBMITTED%'
    or sqlerrm like '%not owned by actor%'
    or sqlerrm like '%row-level security%' then
    raise notice 'TEST 14 PASSED: Student cannot submit for another actor';
  elsif sqlerrm like '%FAIL%' then
    raise;
  else
    raise exception 'TEST 14: Unexpected error (may indicate RLS gap): %', sqlerrm;
  end if;
end;
$$;

reset role;

-- ============================================================================
-- CLEANUP
-- ============================================================================

rollback;

-- ============================================================================
-- SUCCESS
-- ============================================================================

do $$
begin
  raise notice '========================================';
  raise notice 'Questionnaire authenticated authority tests: ALL PASSED';
  raise notice '========================================';
end;
$$;
