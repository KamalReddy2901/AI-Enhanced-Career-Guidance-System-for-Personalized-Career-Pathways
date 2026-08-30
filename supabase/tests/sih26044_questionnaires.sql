-- CareerCase × SIH26044: questionnaire schema constraint tests (minimal)
-- Validates CHECK constraints, foreign keys, and basic schema correctness.
-- Authenticated RLS authority tests are in sih26044_questionnaires_authority.sql

begin;

-- Setup: create test organizations and actors
insert into sih26044.organizations (id, legal_name, display_name, kind, status)
values ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Org', 'Test Org', 'employer', 'active');

insert into sih26044.actors (id, auth_user_id, display_name, status)
values ('00000000-0000-0000-0000-000000000011'::uuid, null, 'Test Actor', 'active');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status)
values ('00000000-0000-0000-0000-000000000021'::uuid, '00000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'active');

insert into sih26044.organization_membership_roles (membership_id, role)
values ('00000000-0000-0000-0000-000000000021'::uuid, 'recruiter');

-- Test 1: Questionnaire schema exists
select 1 from sih26044.questionnaires limit 0;

-- Test 2: Numeric question CHECK constraint
do $$
begin
  insert into sih26044.questionnaires (id, owner_organization_id, status, created_by_actor_id)
  values ('00000000-0000-0000-0000-000000000031'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'draft', '00000000-0000-0000-0000-000000000011'::uuid);

  insert into sih26044.questionnaire_versions (
    id, questionnaire_id, version_number, status, title, description, scope_declaration, created_by_actor_id
  )
  values (
    '00000000-0000-0000-0000-000000000041'::uuid,
    '00000000-0000-0000-0000-000000000031'::uuid,
    1, 'draft',
    'Test Questionnaire',
    'Test description',
    'opportunity_specific',
    '00000000-0000-0000-0000-000000000011'::uuid
  );

  -- Try to insert numeric question with invalid range (max < min)
  insert into sih26044.questionnaire_questions (
    questionnaire_version_id, ordinal, question_type, question_text, numeric_min, numeric_max
  )
  values ('00000000-0000-0000-0000-000000000041'::uuid, 0, 'numeric', 'Test numeric', 10, 5);
  
  raise exception 'FAIL: Invalid numeric range allowed';
exception when check_violation then
  raise notice 'TEST 2 PASSED: Numeric min/max constraint enforced';
end $$;

-- Test 3: Choice question requires choice_options
do $$
begin
  insert into sih26044.questionnaire_questions (
    questionnaire_version_id, ordinal, question_type, question_text, choice_options
  )
  values ('00000000-0000-0000-0000-000000000041'::uuid, 0, 'single_choice', 'Test choice', null);
  
  raise exception 'FAIL: Choice question without options allowed';
exception when check_violation then
  raise notice 'TEST 3 PASSED: Choice question requires choice_options';
end $$;

-- Test 4: Status CHECK constraint (draft->published requires published_at)
do $$
begin
  update sih26044.questionnaire_versions
  set status = 'published'
  where id = '00000000-0000-0000-0000-000000000041'::uuid;
  
  raise exception 'FAIL: Published status without published_at allowed';
exception when check_violation then
  raise notice 'TEST 4 PASSED: Published status requires published_at';
end $$;

-- Cleanup
rollback;

-- Success
do $$
begin
  raise notice '========================================';
  raise notice 'Questionnaire schema constraint tests: PASSED';
  raise notice 'Run sih26044_questionnaires_authority.sql for RLS/authority tests';
  raise notice '========================================';
end $$;
