-- SIH26044 shared contract hardening: retain the existing explicit, atomic
-- publish boundary while recording the exact authenticated human publisher.

create or replace function sih26044.publish_opportunity_version(requested_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  target_version_id uuid;
  target_opportunity_id uuid;
  target_version_number integer;
  target_status sih26044.opportunity_version_status;
  owner_org_id uuid;
  publisher_actor_id uuid;
begin
  publisher_actor_id := sih26044.current_actor_id();
  if publisher_actor_id is null then
    raise exception 'An active SIH actor is required to publish an opportunity version';
  end if;

  select v.id, v.opportunity_id, v.version_number, v.status, o.owner_organization_id
  into target_version_id, target_opportunity_id, target_version_number, target_status, owner_org_id
  from sih26044.opportunity_versions v
  join sih26044.opportunities o on o.id = v.opportunity_id
  where v.id = requested_version_id
  for update of v, o;

  if target_version_id is null then
    raise exception 'Opportunity version not found';
  end if;
  if target_status <> 'draft' then
    raise exception 'Only draft opportunity versions can be published';
  end if;
  if not sih26044.has_any_active_organization_role(
    owner_org_id,
    array['recruiter', 'industry_partner', 'institution_admin', 'faculty']::sih26044.actor_role[]
  ) then
    raise exception 'Actor is not authorized to publish for this organization';
  end if;
  if not exists (
    select 1 from sih26044.opportunity_requirements r
    where r.opportunity_version_id = requested_version_id
  ) then
    raise exception 'A published opportunity version requires at least one confirmed requirement';
  end if;
  if exists (
    select 1 from sih26044.opportunity_requirements r
    where r.opportunity_version_id = requested_version_id
      and (not r.human_confirmed or r.confirmed_by_actor_id is null or r.confirmed_at is null or r.confirmation_method is null)
  ) or exists (
    select 1 from sih26044.eligibility_rules e
    where e.opportunity_version_id = requested_version_id
      and (not e.human_confirmed or e.confirmed_by_actor_id is null or e.confirmed_at is null or e.confirmation_method is null)
  ) then
    raise exception 'All consumed requirements and eligibility rules need complete human confirmation';
  end if;

  update sih26044.opportunity_versions
  set status = 'published', published_at = statement_timestamp()
  where id = requested_version_id;

  update sih26044.opportunities
  set current_version_id = requested_version_id,
      status = 'published',
      updated_at = statement_timestamp()
  where id = target_opportunity_id;

  perform sih26044.record_authoritative_audit(
    publisher_actor_id,
    null,
    owner_org_id,
    'opportunity.version_published',
    'opportunity_versions',
    target_version_id::text,
    null,
    jsonb_build_object(
      'opportunityId', target_opportunity_id::text,
      'versionNumber', target_version_number
    )
  );

  return target_version_id;
end
$$;

revoke all on function sih26044.publish_opportunity_version(uuid) from public, anon;
grant execute on function sih26044.publish_opportunity_version(uuid) to authenticated;

comment on function sih26044.publish_opportunity_version(uuid) is
  'Only publishing boundary: explicit authenticated human action, complete confirmation checks, immutable version transition, current-version update, and authoritative publisher audit in one transaction.';
