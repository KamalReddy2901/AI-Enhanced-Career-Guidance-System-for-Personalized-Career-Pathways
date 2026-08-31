-- Keep existing trusted writers compatible while preserving the new explicit state.
-- This derives only from an already authoritative exact/alias/unresolved value.
create or replace function sih26044.derive_requirement_resolution_status()
returns trigger language plpgsql set search_path = pg_catalog, sih26044 as $$
begin
  if new.category <> 'skill' then
    new.resolution_status := null;
    new.resolution_suggestions := '[]'::jsonb;
  elsif new.resolution_status is null then
    new.resolution_status := case
      when new.canonical_resolution in ('exact', 'alias') then 'resolved'::sih26044.requirement_resolution_status
      else 'unresolved'::sih26044.requirement_resolution_status
    end;
  end if;
  return new;
end $$;

create trigger derive_requirement_resolution_status
before insert or update on sih26044.opportunity_requirements
for each row execute function sih26044.derive_requirement_resolution_status();

revoke all on function sih26044.derive_requirement_resolution_status()
from public, anon, authenticated;
