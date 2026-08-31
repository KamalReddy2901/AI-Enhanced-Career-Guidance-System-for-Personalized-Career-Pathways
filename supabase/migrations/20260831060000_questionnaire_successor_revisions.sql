-- CareerCase x SIH26044: immutable published questionnaire revisions.
-- A successor remains a draft until explicit human publication; the stable
-- questionnaire keeps pointing at the previously published version meanwhile.

create or replace function sih26044.create_questionnaire_successor_draft(
  p_source_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_actor_id uuid;
  v_source sih26044.questionnaire_versions%rowtype;
  v_organization_id uuid;
  v_successor_id uuid;
  v_next_version integer;
begin
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid() and status = 'active';
  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'SIH01';
  end if;

  select version, questionnaire.owner_organization_id
  into v_source, v_organization_id
  from sih26044.questionnaire_versions version
  join sih26044.questionnaires questionnaire on questionnaire.id = version.questionnaire_id
  where version.id = p_source_version_id
    and version.status in ('published', 'archived')
  for update of questionnaire;

  if v_source.id is null then
    raise exception 'PUBLISHED_SOURCE_VERSION_REQUIRED' using errcode = 'SIH04';
  end if;

  if not exists (
    select 1
    from sih26044.organization_memberships membership
    join sih26044.organization_membership_roles membership_role
      on membership_role.membership_id = membership.id
    where membership.actor_id = v_actor_id
      and membership.organization_id = v_organization_id
      and membership.status = 'active'
      and membership_role.role in ('institution_admin', 'recruiter')
  ) then
    raise exception 'INSUFFICIENT_AUTHORITY' using errcode = 'SIH02';
  end if;

  if exists (
    select 1 from sih26044.questionnaire_versions version
    where version.questionnaire_id = v_source.questionnaire_id
      and version.status = 'draft'
  ) then
    raise exception 'SUCCESSOR_DRAFT_ALREADY_EXISTS' using errcode = 'SIH03';
  end if;

  select max(version.version_number) + 1 into v_next_version
  from sih26044.questionnaire_versions version
  where version.questionnaire_id = v_source.questionnaire_id;

  insert into sih26044.questionnaire_versions (
    questionnaire_id, version_number, status, title, description,
    scope_declaration, scoring_policy, created_by_actor_id
  ) values (
    v_source.questionnaire_id, v_next_version, 'draft', v_source.title,
    v_source.description, v_source.scope_declaration, v_source.scoring_policy,
    v_actor_id
  ) returning id into v_successor_id;

  insert into sih26044.questionnaire_questions (
    questionnaire_version_id, ordinal, question_type, question_text,
    choice_options, numeric_min, numeric_max, skill_refs, scoring_weight
  )
  select v_successor_id, question.ordinal, question.question_type,
         question.question_text, question.choice_options, question.numeric_min,
         question.numeric_max, question.skill_refs, question.scoring_weight
  from sih26044.questionnaire_questions question
  where question.questionnaire_version_id = v_source.id
  order by question.ordinal;

  return jsonb_build_object(
    'questionnaire_id', v_source.questionnaire_id,
    'source_version_id', v_source.id,
    'successor_version_id', v_successor_id,
    'version_number', v_next_version
  );
end
$$;

revoke all on function sih26044.create_questionnaire_successor_draft(uuid)
from public, anon;
grant execute on function sih26044.create_questionnaire_successor_draft(uuid)
to authenticated;

create or replace function sih26044.update_questionnaire_draft_atomic(
  p_version_id uuid,
  p_title text,
  p_description text,
  p_scope_declaration text,
  p_questions jsonb,
  p_scoring_policy jsonb default null
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
  v_question jsonb;
  v_ordinal integer := 0;
begin
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid() and status = 'active';
  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'SIH01';
  end if;

  select version.questionnaire_id, questionnaire.owner_organization_id
  into v_questionnaire_id, v_organization_id
  from sih26044.questionnaire_versions version
  join sih26044.questionnaires questionnaire on questionnaire.id = version.questionnaire_id
  where version.id = p_version_id and version.status = 'draft'
  for update of version;

  if v_questionnaire_id is null then
    raise exception 'DRAFT_VERSION_REQUIRED' using errcode = 'SIH04';
  end if;

  if not exists (
    select 1
    from sih26044.organization_memberships membership
    join sih26044.organization_membership_roles membership_role
      on membership_role.membership_id = membership.id
    where membership.actor_id = v_actor_id
      and membership.organization_id = v_organization_id
      and membership.status = 'active'
      and membership_role.role in ('institution_admin', 'recruiter')
  ) then
    raise exception 'INSUFFICIENT_AUTHORITY' using errcode = 'SIH02';
  end if;

  if p_scope_declaration not in ('opportunity_specific', 'reusable_technical', 'reusable_soft_skill')
    or jsonb_typeof(p_questions) <> 'array'
    or jsonb_array_length(p_questions) = 0 then
    raise exception 'INVALID_DRAFT_CONTENT' using errcode = 'SIH03';
  end if;

  update sih26044.questionnaire_versions
  set title = p_title, description = p_description,
      scope_declaration = p_scope_declaration,
      scoring_policy = p_scoring_policy
  where id = p_version_id;

  delete from sih26044.questionnaire_questions
  where questionnaire_version_id = p_version_id;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    insert into sih26044.questionnaire_questions (
      questionnaire_version_id, ordinal, question_type, question_text,
      choice_options, numeric_min, numeric_max, skill_refs, scoring_weight
    ) values (
      p_version_id, v_ordinal,
      (v_question->>'question_type')::sih26044.questionnaire_question_type,
      v_question->>'question_text', v_question->'choice_options',
      (v_question->>'numeric_min')::numeric,
      (v_question->>'numeric_max')::numeric,
      coalesce(v_question->'skill_refs', '[]'::jsonb),
      (v_question->>'scoring_weight')::numeric
    );
    v_ordinal := v_ordinal + 1;
  end loop;

  return jsonb_build_object(
    'questionnaire_id', v_questionnaire_id,
    'version_id', p_version_id
  );
end
$$;

revoke all on function sih26044.update_questionnaire_draft_atomic(
  uuid, text, text, text, jsonb, jsonb
) from public, anon;
grant execute on function sih26044.update_questionnaire_draft_atomic(
  uuid, text, text, text, jsonb, jsonb
) to authenticated;

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
  v_published_at timestamptz;
begin
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid() and status = 'active';
  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'SIH01';
  end if;

  select version.questionnaire_id, questionnaire.owner_organization_id
  into v_questionnaire_id, v_organization_id
  from sih26044.questionnaire_versions version
  join sih26044.questionnaires questionnaire on questionnaire.id = version.questionnaire_id
  where version.id = p_version_id and version.status = 'draft'
  for update of questionnaire;

  if v_questionnaire_id is null then
    raise exception 'VERSION_NOT_FOUND_OR_ALREADY_PUBLISHED' using errcode = 'SIH04';
  end if;

  if not exists (
    select 1
    from sih26044.organization_memberships membership
    join sih26044.organization_membership_roles membership_role
      on membership_role.membership_id = membership.id
    where membership.actor_id = v_actor_id
      and membership.organization_id = v_organization_id
      and membership.status = 'active'
      and membership_role.role in ('institution_admin', 'recruiter')
  ) then
    raise exception 'INSUFFICIENT_AUTHORITY' using errcode = 'SIH02';
  end if;

  v_published_at := statement_timestamp();
  update sih26044.questionnaire_versions
  set status = 'published', published_at = v_published_at
  where id = p_version_id and status = 'draft';

  update sih26044.questionnaires
  set status = 'published', current_version_id = p_version_id,
      updated_at = v_published_at
  where id = v_questionnaire_id;

  return jsonb_build_object(
    'questionnaire_id', v_questionnaire_id,
    'version_id', p_version_id,
    'published_at', v_published_at
  );
end
$$;

revoke all on function sih26044.publish_questionnaire_atomic(uuid)
from public, anon;
grant execute on function sih26044.publish_questionnaire_atomic(uuid)
to authenticated;
