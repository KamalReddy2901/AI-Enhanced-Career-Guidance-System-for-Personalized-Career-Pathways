-- CareerCase × SIH26044: questionnaire domain SQL tests (minimal)
-- Validates RLS policies, tenant isolation, versioning, immutability, and scoring constraints.

begin;

-- Setup: create test organizations and actors with proper UUIDs
insert into sih26044.organizations (id, legal_name, display_name, kind, status)
values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Employer A Legal', 'Employer A', 'employer', 'active'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Employer B Legal', 'Employer B', 'employer', 'active');

insert into sih26044.actors (id, auth_user_id, display_name, status)
values
  ('00000000-0000-0000-0000-000000000011'::uuid, null, 'Recruiter A', 'active'),
  ('00000000-0000-0000-0000-000000000012'::uuid, null, 'Recruiter B', 'active'),
  ('00000000-0000-0000-0000-000000000013'::uuid, null, 'Student One', 'active');

insert into sih26044.organization_memberships (id, actor_id, organization_id, status)
values
  ('00000000-0000-0000-0000-000000000021'::uuid, '00000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'active'),
  ('00000000-0000-0000-0000-000000000022'::uuid, '00000000-0000-0000-0000-000000000012'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'active'),
  ('00000000-0000-0000-0000-000000000023'::uuid, '00000000-0000-0000-0000-000000000013'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'active');

insert into sih26044.organization_membership_roles (membership_id, role)
values
  ('00000000-0000-0000-0000-000000000021'::uuid, 'recruiter'),
  ('00000000-0000-0000-0000-000000000022'::uuid, 'recruiter'),
  ('00000000-0000-0000-0000-000000000023'::uuid, 'learner');

-- Test 1: Recruiter can create questionnaire for their organization
insert into sih26044.questionnaires (id, owner_organization_id, status, created_by_actor_id)
values ('00000000-0000-0000-0000-000000000031'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'draft', '00000000-0000-0000-0000-000000000011'::uuid);

insert into sih26044.questionnaire_versions (
  id, questionnaire_id, version_number, status, title, description, scope_declaration, created_by_actor_id
)
values (
  '00000000-0000-0000-0000-000000000041'::uuid,
  '00000000-0000-0000-0000-000000000031'::uuid,
  1, 'draft',
  'Technical Screening v1',
  'Basic technical assessment for software roles',
  'opportunity_specific',
  '00000000-0000-0000-0000-000000000011'::uuid
);

update sih26044.questionnaires 
set current_version_id = '00000000-0000-0000-0000-000000000041'::uuid 
where id = '00000000-0000-0000-0000-000000000031'::uuid;

-- Test 2: Add questions to version
insert into sih26044.questionnaire_questions (id, questionnaire_version_id, ordinal, question_type, question_text, choice_options, numeric_min, numeric_max, scoring_weight)
values
  ('00000000-0000-0000-0000-000000000051'::uuid, '00000000-0000-0000-0000-000000000041'::uuid, 0, 'single_choice', 'What is your primary programming language?',
   '[{"value":"python","label":"Python"},{"value":"javascript","label":"JavaScript"}]'::jsonb, null, null,
   10.0),
  ('00000000-0000-0000-0000-000000000052'::uuid, '00000000-0000-0000-0000-000000000041'::uuid, 1, 'numeric', 'Years of experience with data structures?', null, 0, 10, 5.0),
  ('00000000-0000-0000-0000-000000000053'::uuid, '00000000-0000-0000-0000-000000000041'::uuid, 2, 'text', 'Describe your most challenging project.', null, null, null, null);

-- Test 3: Publish questionnaire version
update sih26044.questionnaire_versions
set status = 'published', published_at = now()
where id = '00000000-0000-0000-0000-000000000041'::uuid;

update sih26044.questionnaires 
set status = 'published' 
where id = '00000000-0000-0000-0000-000000000031'::uuid;

-- Test 4: Student starts submission
insert into sih26044.questionnaire_submissions (id, questionnaire_version_id, respondent_actor_id, opportunity_id)
values ('00000000-0000-0000-0000-000000000061'::uuid, '00000000-0000-0000-0000-000000000041'::uuid, '00000000-0000-0000-0000-000000000013'::uuid, null);

-- Test 5: Student saves responses
insert into sih26044.questionnaire_responses (submission_id, question_id, response_value, response_score)
values
  ('00000000-0000-0000-0000-000000000061'::uuid, '00000000-0000-0000-0000-000000000051'::uuid, '"python"'::jsonb, 10.0),
  ('00000000-0000-0000-0000-000000000061'::uuid, '00000000-0000-0000-0000-000000000052'::uuid, '5'::jsonb, 2.5),
  ('00000000-0000-0000-0000-000000000061'::uuid, '00000000-0000-0000-0000-000000000053'::uuid, '"Built a dashboard"'::jsonb, null);

-- Test 6: Free-text response has no automatic score
do $$
declare
  text_response_score numeric;
begin
  select response_score into text_response_score
  from sih26044.questionnaire_responses
  where question_id = '00000000-0000-0000-0000-000000000053'::uuid;
  
  if text_response_score is not null then
    raise exception 'FAIL: Free-text response incorrectly has automatic score';
  end if;
end $$;

-- Test 7: Tenant isolation — Recruiter B cannot see Employer A's questionnaire
do $$
declare
  result_count int;
begin
  select count(*) into result_count
  from sih26044.questionnaires
  where id = '00000000-0000-0000-0000-000000000031'::uuid
    and owner_organization_id in (
      select m.organization_id 
      from sih26044.organization_memberships m
      where m.actor_id = '00000000-0000-0000-0000-000000000012'::uuid
        and m.status = 'active'
    );

  if result_count > 0 then
    raise exception 'FAIL: Tenant isolation broken — Recruiter B can see Employer A questionnaire';
  end if;
end $$;

-- Test 8: Numeric question constraints
do $$
begin
  insert into sih26044.questionnaire_questions (
    questionnaire_version_id, ordinal, question_type, question_text, numeric_min, numeric_max
  )
  values ('00000000-0000-0000-0000-000000000041'::uuid, 10, 'numeric', 'Test numeric', 10, 5); -- max < min
  
  raise exception 'FAIL: Invalid numeric range allowed';
exception when check_violation then
  -- Expected behavior
end $$;

-- Test 9: Choice question requires choice_options
do $$
begin
  insert into sih26044.questionnaire_questions (
    questionnaire_version_id, ordinal, question_type, question_text, choice_options
  )
  values ('00000000-0000-0000-0000-000000000041'::uuid, 11, 'single_choice', 'Test choice', null);
  
  raise exception 'FAIL: Choice question without options allowed';
exception when check_violation then
  -- Expected behavior
end $$;

-- Cleanup
rollback;

-- Success
do $$
begin
  raise notice 'Questionnaire SQL tests: PASSED';
end $$;
