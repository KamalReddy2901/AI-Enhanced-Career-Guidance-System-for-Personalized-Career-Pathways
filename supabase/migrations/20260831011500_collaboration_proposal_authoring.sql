-- CareerCase × SIH26044: atomic human-authored collaboration proposals.
-- Proposal creation is one authenticated transaction: actor/host authority is
-- derived server-side, partner organizations are explicit, literal objectives
-- are preserved, and the existing append-only lifecycle trigger records the
-- initial proposed event. No approval, verification, evidence, or endorsement
-- is inferred by this boundary.

create or replace function sih26044.list_collaboration_partner_organizations(
  requested_host_organization_id uuid
)
returns table (
  organization_id uuid,
  display_name text,
  kind text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
begin
  if sih26044.current_actor_id() is null
     or not sih26044.has_any_active_organization_role(
       requested_host_organization_id,
       array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
     ) then
    raise exception 'Actor is not authorized to author collaborations for this host organization';
  end if;

  return query
  select o.id, o.display_name, o.kind::text
  from sih26044.organizations o
  where o.status = 'active'
    and o.id <> requested_host_organization_id
  order by o.display_name, o.id;
end
$$;

create or replace function sih26044.create_collaboration_proposal(
  requested_host_organization_id uuid,
  requested_kind sih26044.collaboration_kind,
  requested_partner_organization_ids uuid[],
  requested_objectives text[],
  requested_starts_at timestamptz default null,
  requested_ends_at timestamptz default null,
  requested_opportunity_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  current_actor uuid;
  proposal_id uuid;
  partner_count integer;
  objective_count integer;
begin
  current_actor := sih26044.current_actor_id();
  if current_actor is null then
    raise exception 'An active SIH actor is required to create a collaboration proposal';
  end if;

  if requested_host_organization_id is null
     or not sih26044.has_any_active_organization_role(
       requested_host_organization_id,
       array['faculty', 'institution_admin', 'industry_partner']::sih26044.actor_role[]
     ) then
    raise exception 'Actor is not authorized to author collaborations for this host organization';
  end if;

  if requested_kind is null then
    raise exception 'Collaboration kind is required';
  end if;

  select count(distinct partner_id)
  into partner_count
  from unnest(coalesce(requested_partner_organization_ids, '{}'::uuid[])) as p(partner_id)
  where partner_id is not null;

  if partner_count < 1 then
    raise exception 'At least one explicit partner organization is required';
  end if;

  if requested_host_organization_id = any(coalesce(requested_partner_organization_ids, '{}'::uuid[])) then
    raise exception 'Host organization cannot also be a partner organization';
  end if;

  if exists (
    select 1
    from (
      select distinct partner_id
      from unnest(coalesce(requested_partner_organization_ids, '{}'::uuid[])) as p(partner_id)
      where partner_id is not null
    ) requested
    left join sih26044.organizations o on o.id = requested.partner_id
    where o.id is null or o.status <> 'active'
  ) then
    raise exception 'Every collaboration partner must be an active registered organization';
  end if;

  select count(*)
  into objective_count
  from unnest(coalesce(requested_objectives, '{}'::text[])) as objective(value);

  if objective_count < 1 then
    raise exception 'At least one literal collaboration objective is required';
  end if;

  if exists (
    select 1
    from unnest(coalesce(requested_objectives, '{}'::text[])) as objective(value)
    where length(btrim(coalesce(value, ''))) = 0
       or length(btrim(value)) > 500
  ) then
    raise exception 'Every collaboration objective must contain 1 to 500 characters';
  end if;

  if requested_starts_at is not null
     and requested_ends_at is not null
     and requested_ends_at < requested_starts_at then
    raise exception 'Collaboration end time cannot precede start time';
  end if;

  if requested_opportunity_id is not null and not exists (
    select 1
    from sih26044.opportunities o
    where o.id = requested_opportunity_id
      and (
        o.owner_organization_id = requested_host_organization_id
        or o.owner_organization_id = any(coalesce(requested_partner_organization_ids, '{}'::uuid[]))
      )
  ) then
    raise exception 'Linked opportunity must belong to the host or an explicit partner organization';
  end if;

  insert into sih26044.collaboration_engagements (
    kind,
    opportunity_id,
    host_organization_id,
    status,
    starts_at,
    ends_at,
    created_by_actor_id
  ) values (
    requested_kind,
    requested_opportunity_id,
    requested_host_organization_id,
    'proposed',
    requested_starts_at,
    requested_ends_at,
    current_actor
  )
  returning id into proposal_id;

  insert into sih26044.collaboration_partner_organizations (
    collaboration_engagement_id,
    organization_id
  )
  select proposal_id, partner_id
  from (
    select distinct partner_id
    from unnest(requested_partner_organization_ids) as p(partner_id)
    where partner_id is not null
  ) partners;

  -- Proposal authorship is the only participant identity inferred here. Other
  -- people require a separate explicit participant/acceptance workflow.
  insert into sih26044.collaboration_participants (
    collaboration_engagement_id,
    actor_id
  ) values (
    proposal_id,
    current_actor
  );

  insert into sih26044.collaboration_objectives (
    collaboration_engagement_id,
    ordinal,
    objective
  )
  select proposal_id, (ordinality - 1)::integer, btrim(value)
  from unnest(requested_objectives) with ordinality as objective(value, ordinality);

  perform sih26044.record_authoritative_audit(
    current_actor,
    null,
    requested_host_organization_id,
    'collaboration.proposal_created',
    'collaboration_engagement',
    proposal_id::text,
    null,
    jsonb_build_object(
      'kind', requested_kind,
      'partnerCount', partner_count,
      'objectiveCount', objective_count,
      'opportunityId', requested_opportunity_id
    )
  );

  return proposal_id;
end
$$;

-- Browser writes must use the atomic proposal boundary. Existing RLS policies
-- remain useful defense in depth, but partial direct inserts are no longer a
-- production client capability.
revoke insert on sih26044.collaboration_engagements from authenticated;
revoke insert on sih26044.collaboration_partner_organizations from authenticated;
revoke insert on sih26044.collaboration_participants from authenticated;
revoke insert on sih26044.collaboration_objectives from authenticated;

revoke all on function sih26044.list_collaboration_partner_organizations(uuid) from public, anon;
revoke all on function sih26044.create_collaboration_proposal(
  uuid,
  sih26044.collaboration_kind,
  uuid[],
  text[],
  timestamptz,
  timestamptz,
  uuid
) from public, anon;

grant execute on function sih26044.list_collaboration_partner_organizations(uuid) to authenticated;
grant execute on function sih26044.create_collaboration_proposal(
  uuid,
  sih26044.collaboration_kind,
  uuid[],
  text[],
  timestamptz,
  timestamptz,
  uuid
) to authenticated;

comment on function sih26044.create_collaboration_proposal(
  uuid,
  sih26044.collaboration_kind,
  uuid[],
  text[],
  timestamptz,
  timestamptz,
  uuid
) is
  'Atomic human-authored SIH26044 collaboration proposal. Derives actor authority, preserves literal objectives and explicit partner organizations, initializes append-only proposed history, and never infers approval, verification, evidence, or endorsement.';
