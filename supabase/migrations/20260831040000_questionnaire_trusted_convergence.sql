-- CareerCase × SIH26044: Questionnaire trusted convergence
-- 
-- DEFECT REPAIR for PR #44:
-- 
-- 1. Browser-supplied actor/organization authority → database-derived from auth.uid()
-- 2. Non-atomic authoring → single trusted RPC
-- 3. Direct browser publication → explicit trusted human publication
-- 4. Published immutability → RLS mutation blocks + CHECK enforcement
-- 5. Questionnaire/opportunity binding correctness → stable questionnaire_id binding
-- 6. Browser-authoritative scoring → trusted finalization RPC
-- 7. Submission finalization → atomic trusted boundary
-- 8. RLS write transition → explicit trusted submit RPC
-- 9. Authenticated SQL authority tests → separate test file with SET LOCAL role
-- 10. Explicit production contracts → allowlisted fields
--
-- This migration adds:
-- - Trusted atomic questionnaire authoring RPC
-- - Trusted atomic questionnaire publication RPC
-- - Trusted atomic submission finalization RPC
-- - Immutability protection for published versions/questions
-- - Correct questionnaire_id (not version_id) binding in opportunity assignments
-- - RLS UPDATE blocks for published questionnaires
-- - Deterministic server-side scoring computation

-- ============================================================================
-- TRUSTED RPC: Create questionnaire with atomic authoring
-- ============================================================================
--
-- Authority: authenticated actor with active recruiter/institution_admin role
-- in target organization. Organization membership verified server-side.
--
-- Returns: { questionnaire_id, version_id }

create or replace function sih26044.create_questionnaire_atomic(
  p_organization_id uuid,
  p_title text,
  p_description text,
  p_scope_declaration text,
  p_questions jsonb, -- Array of { question_type, question_text, choice_options?, numeric_min?, numeric_max?, skill_refs?, scoring_weight? }
  p_scoring_policy jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_actor_id uuid;
  v_has_authority boolean;
  v_questionnaire_id uuid;
  v_version_id uuid;
  v_question_item jsonb;
  v_ordinal int := 0;
begin
  -- Resolve current authenticated actor
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid()
    and status = 'active';

  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using
      errcode = 'SIH01',
      message = 'Authenticated actor not found or inactive.',
      hint = 'Ensure authenticated user has an active SIH actor record.';
  end if;

  -- Verify organizational authority
  select exists(
    select 1
    from sih26044.organization_memberships m
    inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
    where m.actor_id = v_actor_id
      and m.organization_id = p_organization_id
      and m.status = 'active'
      and mr.role in ('institution_admin', 'recruiter')
  ) into v_has_authority;

  if not v_has_authority then
    raise exception using
      errcode = 'SIH02',
      message = 'INSUFFICIENT_AUTHORITY: Actor does not have recruiter or institution_admin authority for this organization.',
      hint = 'Questionnaire authoring requires active membership with recruiter or institution_admin role.';
  end if;

  -- Validate inputs
  if not (p_scope_declaration in ('opportunity_specific', 'reusable_technical', 'reusable_soft_skill')) then
    raise exception 'INVALID_SCOPE' using
      errcode = 'SIH03',
      message = 'Invalid scope_declaration. Must be opportunity_specific, reusable_technical, or reusable_soft_skill.';
  end if;

  if jsonb_typeof(p_questions) != 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'INVALID_QUESTIONS' using
      errcode = 'SIH03',
      message = 'Questions must be a non-empty JSON array.';
  end if;

  -- Insert questionnaire (atomic)
  insert into sih26044.questionnaires (owner_organization_id, status, created_by_actor_id)
  values (p_organization_id, 'draft', v_actor_id)
  returning id into v_questionnaire_id;

  -- Insert version
  insert into sih26044.questionnaire_versions (
    questionnaire_id, version_number, status, title, description,
    scope_declaration, scoring_policy, created_by_actor_id
  )
  values (
    v_questionnaire_id, 1, 'draft', p_title, p_description,
    p_scope_declaration, p_scoring_policy, v_actor_id
  )
  returning id into v_version_id;

  -- Update current_version_id
  update sih26044.questionnaires
  set current_version_id = v_version_id
  where id = v_questionnaire_id;

  -- Insert questions (atomic batch)
  for v_question_item in select * from jsonb_array_elements(p_questions)
  loop
    insert into sih26044.questionnaire_questions (
      questionnaire_version_id, ordinal, question_type, question_text,
      choice_options, numeric_min, numeric_max, skill_refs, scoring_weight
    )
    values (
      v_version_id,
      v_ordinal,
      (v_question_item->>'question_type')::sih26044.questionnaire_question_type,
      v_question_item->>'question_text',
      v_question_item->'choice_options',
      (v_question_item->>'numeric_min')::numeric,
      (v_question_item->>'numeric_max')::numeric,
      coalesce(v_question_item->'skill_refs', '[]'::jsonb),
      (v_question_item->>'scoring_weight')::numeric
    );

    v_ordinal := v_ordinal + 1;
  end loop;

  return jsonb_build_object(
    'questionnaire_id', v_questionnaire_id,
    'version_id', v_version_id
  );
end;
$$;

comment on function sih26044.create_questionnaire_atomic is
  'Atomically create questionnaire with version and questions. Actor/organization authority verified server-side.';

revoke all on function sih26044.create_questionnaire_atomic from public, anon;
grant execute on function sih26044.create_questionnaire_atomic to authenticated;

-- ============================================================================
-- TRUSTED RPC: Publish questionnaire version
-- ============================================================================

create or replace function sih26044.publish_questionnaire_atomic(
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_actor_id uuid;
  v_questionnaire_id uuid;
  v_organization_id uuid;
  v_has_authority boolean;
  v_published_at timestamptz;
begin
  -- Resolve current authenticated actor
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid()
    and status = 'active';

  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'SIH01';
  end if;

  -- Get questionnaire context
  select qv.questionnaire_id, q.owner_organization_id
  into v_questionnaire_id, v_organization_id
  from sih26044.questionnaire_versions qv
  inner join sih26044.questionnaires q on q.id = qv.questionnaire_id
  where qv.id = p_version_id
    and qv.status = 'draft';

  if v_questionnaire_id is null then
    raise exception 'VERSION_NOT_FOUND_OR_ALREADY_PUBLISHED' using
      errcode = 'SIH04',
      message = 'Questionnaire version not found or already published.';
  end if;

  -- Verify authority
  select exists(
    select 1
    from sih26044.organization_memberships m
    inner join sih26044.organization_membership_roles mr on mr.membership_id = m.id
    where m.actor_id = v_actor_id
      and m.organization_id = v_organization_id
      and m.status = 'active'
      and mr.role in ('institution_admin', 'recruiter')
  ) into v_has_authority;

  if not v_has_authority then
    raise exception using
      errcode = 'SIH02',
      message = 'INSUFFICIENT_AUTHORITY: Actor does not have authority to publish this questionnaire.';
  end if;

  -- Derive authoritative publication timestamp
  v_published_at := now();

  -- Atomic publication
  update sih26044.questionnaire_versions
  set status = 'published',
      published_at = v_published_at
  where id = p_version_id
    and status = 'draft';

  update sih26044.questionnaires
  set status = 'published'
  where id = v_questionnaire_id;

  return jsonb_build_object(
    'questionnaire_id', v_questionnaire_id,
    'version_id', p_version_id,
    'published_at', v_published_at
  );
end;
$$;

comment on function sih26044.publish_questionnaire_atomic is
  'Publish questionnaire version. Authority verified server-side. Timestamp derived server-side.';

revoke all on function sih26044.publish_questionnaire_atomic from public, anon;
grant execute on function sih26044.publish_questionnaire_atomic to authenticated;

-- ============================================================================
-- TRUSTED RPC: Submit questionnaire (finalize with deterministic scoring)
-- ============================================================================

create or replace function sih26044.submit_questionnaire_atomic(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_actor_id uuid;
  v_submission record;
  v_version record;
  v_question record;
  v_response record;
  v_scoring_policy jsonb;
  v_max_score numeric := 0;
  v_computed_score numeric := 0;
  v_response_score numeric;
  v_submitted_at timestamptz;
  v_required_question_ids uuid[];
  v_answered_question_ids uuid[];
  v_missing_count int;
begin
  -- Resolve current authenticated actor
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid()
    and status = 'active';

  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'SIH01';
  end if;

  -- Get submission (verify ownership)
  select * into v_submission
  from sih26044.questionnaire_submissions
  where id = p_submission_id
    and respondent_actor_id = v_actor_id
    and submitted_at is null;

  if v_submission.id is null then
    raise exception 'SUBMISSION_NOT_FOUND_OR_ALREADY_SUBMITTED' using
      errcode = 'SIH05',
      message = 'Submission not found, not owned by actor, or already submitted.';
  end if;

  -- Get version + scoring policy
  select * into v_version
  from sih26044.questionnaire_versions
  where id = v_submission.questionnaire_version_id;

  v_scoring_policy := v_version.scoring_policy;

  -- Validate completeness (assume all questions required)
  select array_agg(id) into v_required_question_ids
  from sih26044.questionnaire_questions
  where questionnaire_version_id = v_submission.questionnaire_version_id;

  select array_agg(distinct question_id) into v_answered_question_ids
  from sih26044.questionnaire_responses
  where submission_id = p_submission_id;

  select count(*) into v_missing_count
  from unnest(v_required_question_ids) qid
  where qid != all(coalesce(v_answered_question_ids, array[]::uuid[]));

  if v_missing_count > 0 then
    raise exception 'SUBMISSION_INCOMPLETE' using
      errcode = 'SIH06',
      message = format('Submission incomplete: %s required questions unanswered.', v_missing_count);
  end if;

  -- Compute deterministic score if scoring policy exists
  if v_scoring_policy is not null then
    for v_question in
      select qq.*
      from sih26044.questionnaire_questions qq
      where qq.questionnaire_version_id = v_submission.questionnaire_version_id
        and qq.scoring_weight is not null
        and qq.scoring_weight > 0
        and qq.question_type in ('single_choice', 'multiple_choice', 'numeric')
    loop
      -- Get response
      select * into v_response
      from sih26044.questionnaire_responses
      where submission_id = p_submission_id
        and question_id = v_question.id;

      if v_response.id is null then
        continue;
      end if;

      -- Score response (deterministic)
      if v_question.question_type = 'single_choice' then
        -- No browser-visible answer key exists yet, so choice responses are
        -- deliberately not scored. Option order is never scoring authority.
        v_response_score := null;
      elsif v_question.question_type = 'multiple_choice' then
        v_response_score := null;
      elsif v_question.question_type = 'numeric' then
        -- Normalize within range
        declare
          v_value numeric := (v_response.response_value::text)::numeric;
          v_normalized numeric;
        begin
          v_value := greatest(v_question.numeric_min, least(v_question.numeric_max, v_value));
          v_normalized := (v_value - v_question.numeric_min) / (v_question.numeric_max - v_question.numeric_min);
          v_response_score := v_normalized * v_question.scoring_weight;
        end;
      else
        v_response_score := 0;
      end if;

      -- Update response score
      if v_response_score is not null then
        update sih26044.questionnaire_responses
        set response_score = v_response_score
        where id = v_response.id;

        v_computed_score := v_computed_score + v_response_score;
        v_max_score := v_max_score + v_question.scoring_weight;
      end if;
    end loop;
  end if;

  -- Derive authoritative submission timestamp
  v_submitted_at := now();

  -- Finalize submission
  update sih26044.questionnaire_submissions
  set submitted_at = v_submitted_at,
      computed_score = case when v_scoring_policy is not null then v_computed_score else null end,
      score_computed_at = case when v_scoring_policy is not null then v_submitted_at else null end,
      scoring_policy_version = case when v_scoring_policy is not null then v_scoring_policy->>'version' else null end
  where id = p_submission_id;

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'submitted_at', v_submitted_at,
    'computed_score', v_computed_score,
    'max_score', v_max_score
  );
end;
$$;

comment on function sih26044.submit_questionnaire_atomic is
  'Finalize questionnaire submission with deterministic server-side scoring. Timestamp derived server-side.';

revoke all on function sih26044.submit_questionnaire_atomic from public, anon;
grant execute on function sih26044.submit_questionnaire_atomic to authenticated;

-- ============================================================================
-- IMMUTABILITY PROTECTION: Block mutation of published questionnaires
-- ============================================================================

-- Block UPDATE on published questionnaire_versions (title, description, questions, scoring_policy)
create or replace function sih26044.block_published_questionnaire_mutation()
returns trigger
language plpgsql
as $$
begin
  if OLD.status = 'published' and NEW.status = 'published' then
    -- Allow status transition to archived, but block content mutation
    if (OLD.title, OLD.description, OLD.scope_declaration, OLD.scoring_policy) is distinct from
       (NEW.title, NEW.description, NEW.scope_declaration, NEW.scoring_policy) then
      raise exception 'PUBLISHED_VERSION_IMMUTABLE' using
        errcode = 'SIH07',
        message = 'Published questionnaire version content cannot be mutated. Create a successor draft instead.';
    end if;
  end if;
  return NEW;
end;
$$;

revoke execute on function sih26044.block_published_questionnaire_mutation() from public;

create trigger block_published_questionnaire_version_mutation
  before update on sih26044.questionnaire_versions
  for each row
  execute function sih26044.block_published_questionnaire_mutation();

-- Block UPDATE/DELETE on questions of published versions
create or replace function sih26044.block_published_question_mutation()
returns trigger
language plpgsql
as $$
declare
  v_version_status sih26044.questionnaire_status;
begin
  select status into v_version_status
  from sih26044.questionnaire_versions
  where id = coalesce(NEW.questionnaire_version_id, OLD.questionnaire_version_id);

  if v_version_status = 'published' then
    raise exception 'PUBLISHED_QUESTION_IMMUTABLE' using
      errcode = 'SIH07',
      message = 'Questions of published questionnaire versions cannot be mutated.';
  end if;

  return coalesce(NEW, OLD);
end;
$$;

revoke execute on function sih26044.block_published_question_mutation() from public;

create trigger block_published_question_mutation
  before update or delete on sih26044.questionnaire_questions
  for each row
  execute function sih26044.block_published_question_mutation();

-- Block UPDATE on submitted questionnaire_submissions
create or replace function sih26044.block_submitted_submission_mutation()
returns trigger
language plpgsql
as $$
begin
  if OLD.submitted_at is not null then
    raise exception 'SUBMITTED_SUBMISSION_IMMUTABLE' using
      errcode = 'SIH08',
      message = 'Submitted questionnaire submissions cannot be mutated.';
  end if;
  return NEW;
end;
$$;

revoke execute on function sih26044.block_submitted_submission_mutation() from public;

create trigger block_submitted_submission_mutation
  before update on sih26044.questionnaire_submissions
  for each row
  execute function sih26044.block_submitted_submission_mutation();

-- ============================================================================
-- FIX: Opportunity questionnaire binding correctness
-- ============================================================================
--
-- DEFECT: opportunity_questionnaire_assignments.questionnaire_id references
-- questionnaires.id (stable), but RLS policy compared against
-- questionnaire_versions.id (versioned). This breaks published questionnaire
-- discovery.
--
-- FIX: RLS policy must resolve questionnaire_id -> current published version_id

-- Drop incorrect RLS policy
drop policy if exists questionnaire_versions_read on sih26044.questionnaire_versions;

-- Recreate with correct binding
create policy questionnaire_versions_read on sih26044.questionnaire_versions
  for select using (
    -- Org members see all versions
    questionnaire_id in (
      select q.id from sih26044.questionnaires q
      where q.owner_organization_id in (
        select organization_id from sih26044.organization_memberships
        where actor_id = sih26044.current_actor_id()
          and status = 'active'
      )
    )
    or
    -- Students see only published versions of questionnaires assigned to published opportunities
    (status = 'published' and questionnaire_id in (
      select qa.questionnaire_id from sih26044.opportunity_questionnaire_assignments qa
      inner join sih26044.opportunity_versions ov on ov.id = qa.opportunity_version_id
      where ov.status = 'published'
    ))
  );

-- Starting a submission is the one intentional direct write on submissions.
-- Bind opportunity-specific questionnaires to the exact published opportunity
-- version supplied by the student; reusable published questionnaires may be
-- started without an opportunity context.
drop policy if exists questionnaire_submissions_student_write
  on sih26044.questionnaire_submissions;
create policy questionnaire_submissions_student_insert
  on sih26044.questionnaire_submissions
  for insert
  to authenticated
  with check (
    respondent_actor_id = sih26044.current_actor_id()
    and submitted_at is null
    and exists (
      select 1
      from sih26044.questionnaire_versions qv
      where qv.id = questionnaire_version_id
        and qv.status = 'published'
        and (
          (qv.scope_declaration <> 'opportunity_specific'
            and opportunity_id is null
            and opportunity_version_id is null)
          or exists (
            select 1
            from sih26044.opportunity_questionnaire_assignments oqa
            join sih26044.opportunity_versions ov
              on ov.id = oqa.opportunity_version_id
            where oqa.questionnaire_id = qv.questionnaire_id
              and oqa.opportunity_version_id = questionnaire_submissions.opportunity_version_id
              and ov.opportunity_id = questionnaire_submissions.opportunity_id
              and ov.status = 'published'
          )
        )
    )
  );

-- ============================================================================
-- ATTESTATION: Questionnaire submission outcomes as assessed evidence
-- ============================================================================
--
-- Questionnaire results are bounded 'assessed' evidence with explicit provenance.
-- They are NOT issuer-verified credentials or universal mastery claims.

comment on table sih26044.questionnaire_submissions is
  'Student responses to industry-authored questionnaires. Completed submissions produce assessed evidence with explicit questionnaire/version/organization provenance. Results are context-bound and NOT hiring probabilities.';

comment on column sih26044.questionnaire_submissions.computed_score is
  'Deterministic score computed from scoreable questions. Not a hiring probability, candidate quality ranking, or employment suitability judgment. Server-derived, reproducible, and auditable.';

-- ============================================================================
-- ACTOR DISPLAY NAME FIX
-- ============================================================================
--
-- DEFECT: Historical code read actors.name but current schema uses display_name

-- No migration needed - this is a client-side TypeScript fix only

-- ============================================================================
-- GRANT service_role EXECUTE on trusted RPCs
-- ============================================================================
--
-- Worker calls these RPCs as service_role via dbElevated.rpc()
-- (Though for questionnaires, most operations should use user-context client)

grant execute on function sih26044.create_questionnaire_atomic to service_role;
grant execute on function sih26044.publish_questionnaire_atomic to service_role;
grant execute on function sih26044.submit_questionnaire_atomic to service_role;

-- ============================================================================
-- DATA API ACLS: expose only the operations intentionally used by the browser
-- ============================================================================
--
-- RLS decides which rows an authenticated actor may reach; table/column grants
-- decide which operations are exposed through PostgREST at all. High-impact
-- questionnaire creation, publication, and submission finalization remain RPC
-- only. In particular, the browser can never write authoritative score fields.

revoke all on table sih26044.questionnaires from anon, authenticated;
revoke all on table sih26044.questionnaire_versions from anon, authenticated;
revoke all on table sih26044.questionnaire_questions from anon, authenticated;
revoke all on table sih26044.opportunity_questionnaire_assignments from anon, authenticated;
revoke all on table sih26044.questionnaire_submissions from anon, authenticated;
revoke all on table sih26044.questionnaire_responses from anon, authenticated;

grant select on table
  sih26044.questionnaires,
  sih26044.questionnaire_versions,
  sih26044.questionnaire_questions,
  sih26044.opportunity_questionnaire_assignments,
  sih26044.questionnaire_submissions,
  sih26044.questionnaire_responses
to authenticated;

-- Opportunity owners deliberately retain RLS-bounded assignment editing.
grant insert, update, delete on table
  sih26044.opportunity_questionnaire_assignments
to authenticated;

-- Students may open an owned draft submission. Finalization is RPC-only.
grant insert on table sih26044.questionnaire_submissions to authenticated;

-- Draft answers may be saved directly, but authoritative scoring is never a
-- browser-writable column. answered_at remains database-derived on insert.
grant insert (submission_id, question_id, response_value)
  on table sih26044.questionnaire_responses to authenticated;
grant update (response_value)
  on table sih26044.questionnaire_responses to authenticated;
