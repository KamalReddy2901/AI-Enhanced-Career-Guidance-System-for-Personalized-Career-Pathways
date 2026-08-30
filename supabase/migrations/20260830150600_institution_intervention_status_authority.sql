-- Expose current intervention status only through the same institution-admin
-- authority as the operational intervention surface. This permits RLS/tests to
-- inspect lifecycle state without creating a cross-tenant existence oracle.

create or replace function sih26044.current_institution_intervention_status(requested_intervention_id uuid)
returns sih26044.institution_intervention_status
language plpgsql
stable
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  organization_id uuid;
  result sih26044.institution_intervention_status;
begin
  select i.organization_id
  into organization_id
  from sih26044.institution_interventions i
  where i.id = requested_intervention_id;

  if organization_id is null then
    return null;
  end if;
  if not sih26044.has_active_organization_role(organization_id, 'institution_admin') then
    raise exception 'Institution-admin authority is required to read intervention lifecycle state';
  end if;

  select coalesce(
    (
      select e.to_status
      from sih26044.institution_intervention_events e
      where e.intervention_id = requested_intervention_id
      order by e.sequence_number desc
      limit 1
    ),
    (
      select i.initial_status
      from sih26044.institution_interventions i
      where i.id = requested_intervention_id
    )
  )
  into result;

  return result;
end
$$;

revoke all on function sih26044.current_institution_intervention_status(uuid) from public, anon;
grant execute on function sih26044.current_institution_intervention_status(uuid) to authenticated;
