-- CareerCase x SIH26044: bind an opportunity version to one exact immutable
-- questionnaire version. Successor publication must never rewrite an existing
-- opportunity's assessment contract.

alter table sih26044.opportunity_questionnaire_assignments
  add column questionnaire_version_id uuid;

update sih26044.opportunity_questionnaire_assignments assignment
set questionnaire_version_id = questionnaire.current_version_id
from sih26044.questionnaires questionnaire
where questionnaire.id = assignment.questionnaire_id;

alter table sih26044.opportunity_questionnaire_assignments
  alter column questionnaire_version_id set not null,
  add constraint opportunity_questionnaire_exact_version_fk
    foreign key (questionnaire_version_id, questionnaire_id)
    references sih26044.questionnaire_versions(id, questionnaire_id)
    on delete restrict;

drop policy if exists questionnaire_versions_read
  on sih26044.questionnaire_versions;
create policy questionnaire_versions_read
on sih26044.questionnaire_versions
for select to authenticated
using (
  questionnaire_id in (
    select questionnaire.id
    from sih26044.questionnaires questionnaire
    where questionnaire.owner_organization_id in (
      select membership.organization_id
      from sih26044.organization_memberships membership
      where membership.actor_id = sih26044.current_actor_id()
        and membership.status = 'active'
    )
  )
  or (
    status = 'published'
    and exists (
      select 1
      from sih26044.opportunity_questionnaire_assignments assignment
      join sih26044.opportunity_versions opportunity_version
        on opportunity_version.id = assignment.opportunity_version_id
      where assignment.questionnaire_version_id = questionnaire_versions.id
        and opportunity_version.status = 'published'
    )
  )
);

drop policy if exists questionnaire_submissions_student_insert
  on sih26044.questionnaire_submissions;
create policy questionnaire_submissions_student_insert
on sih26044.questionnaire_submissions
for insert to authenticated
with check (
  respondent_actor_id = sih26044.current_actor_id()
  and submitted_at is null
  and exists (
    select 1
    from sih26044.questionnaire_versions questionnaire_version
    where questionnaire_version.id = questionnaire_version_id
      and questionnaire_version.status = 'published'
      and (
        (
          questionnaire_version.scope_declaration <> 'opportunity_specific'
          and opportunity_id is null
          and opportunity_version_id is null
        )
        or exists (
          select 1
          from sih26044.opportunity_questionnaire_assignments assignment
          join sih26044.opportunity_versions bound_opportunity_version
            on bound_opportunity_version.id = assignment.opportunity_version_id
          where assignment.questionnaire_version_id = questionnaire_submissions.questionnaire_version_id
            and assignment.questionnaire_id = questionnaire_version.questionnaire_id
            and assignment.opportunity_version_id = questionnaire_submissions.opportunity_version_id
            and bound_opportunity_version.opportunity_id = questionnaire_submissions.opportunity_id
            and bound_opportunity_version.status = 'published'
        )
      )
  )
);

create or replace function sih26044.attach_questionnaire_to_opportunity_version(
  p_opportunity_version_id uuid,
  p_questionnaire_version_id uuid,
  p_required boolean default true,
  p_ordinal integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_actor_id uuid;
  v_questionnaire_id uuid;
  v_questionnaire_organization_id uuid;
  v_opportunity_organization_id uuid;
  v_assignment_id uuid;
begin
  select id into v_actor_id
  from sih26044.actors
  where auth_user_id = auth.uid() and status = 'active';
  if v_actor_id is null then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'SIH01';
  end if;

  select questionnaire_version.questionnaire_id,
         questionnaire.owner_organization_id
  into v_questionnaire_id, v_questionnaire_organization_id
  from sih26044.questionnaire_versions questionnaire_version
  join sih26044.questionnaires questionnaire
    on questionnaire.id = questionnaire_version.questionnaire_id
  where questionnaire_version.id = p_questionnaire_version_id
    and questionnaire_version.status = 'published';

  select opportunity.owner_organization_id
  into v_opportunity_organization_id
  from sih26044.opportunity_versions opportunity_version
  join sih26044.opportunities opportunity
    on opportunity.id = opportunity_version.opportunity_id
  where opportunity_version.id = p_opportunity_version_id
    and opportunity_version.status = 'draft'
  for update of opportunity_version;

  if v_questionnaire_id is null or v_opportunity_organization_id is null then
    raise exception 'PUBLISHED_QUESTIONNAIRE_AND_DRAFT_OPPORTUNITY_REQUIRED' using errcode = 'SIH04';
  end if;
  if v_questionnaire_organization_id <> v_opportunity_organization_id then
    raise exception 'CROSS_ORGANIZATION_ATTACHMENT_NOT_ALLOWED' using errcode = 'SIH02';
  end if;
  if p_ordinal < 0 then
    raise exception 'INVALID_ORDINAL' using errcode = 'SIH03';
  end if;
  if not exists (
    select 1
    from sih26044.organization_memberships membership
    join sih26044.organization_membership_roles membership_role
      on membership_role.membership_id = membership.id
    where membership.actor_id = v_actor_id
      and membership.organization_id = v_opportunity_organization_id
      and membership.status = 'active'
      and membership_role.role in ('institution_admin', 'recruiter')
  ) then
    raise exception 'INSUFFICIENT_AUTHORITY' using errcode = 'SIH02';
  end if;

  insert into sih26044.opportunity_questionnaire_assignments (
    opportunity_version_id, questionnaire_id, questionnaire_version_id,
    required, ordinal
  ) values (
    p_opportunity_version_id, v_questionnaire_id, p_questionnaire_version_id,
    p_required, p_ordinal
  )
  on conflict (opportunity_version_id, questionnaire_id)
  do update set questionnaire_version_id = excluded.questionnaire_version_id,
                required = excluded.required,
                ordinal = excluded.ordinal
  returning id into v_assignment_id;

  return jsonb_build_object(
    'assignment_id', v_assignment_id,
    'opportunity_version_id', p_opportunity_version_id,
    'questionnaire_id', v_questionnaire_id,
    'questionnaire_version_id', p_questionnaire_version_id
  );
end
$$;

revoke all on function sih26044.attach_questionnaire_to_opportunity_version(
  uuid, uuid, boolean, integer
) from public, anon;
grant execute on function sih26044.attach_questionnaire_to_opportunity_version(
  uuid, uuid, boolean, integer
) to authenticated;

revoke insert, update, delete
on sih26044.opportunity_questionnaire_assignments from authenticated;

comment on column sih26044.opportunity_questionnaire_assignments.questionnaire_version_id is
  'Exact immutable published questionnaire version attached to this opportunity version.';
