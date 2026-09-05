-- Cleanup: Revoke and drop ALL temporary controlled demo ecosystem seeding functions.
-- Execute ONLY after BrowserOS production rehearsal is complete and demo ecosystem validated.
-- Domain data (organizations, opportunities, evidence, applications, etc.) is NOT deleted.

-- Revoke EXECUTE before dropping
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'sih26044' and p.proname = 'seed_controlled_demo_ecosystem') then
    revoke execute on function sih26044.seed_controlled_demo_ecosystem() from service_role;
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'sih26044' and p.proname = 'seed_controlled_demo_ecosystem_phase2') then
    revoke execute on function sih26044.seed_controlled_demo_ecosystem_phase2() from service_role;
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'sih26044' and p.proname = 'seed_controlled_demo_ecosystem_phase2b') then
    revoke execute on function sih26044.seed_controlled_demo_ecosystem_phase2b() from service_role;
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'sih26044' and p.proname = 'controlled_demo_seed_status') then
    revoke execute on function sih26044.controlled_demo_seed_status() from service_role;
  end if;
end $$;

-- Drop temporary seeding and verification functions
drop function if exists sih26044.seed_controlled_demo_ecosystem();
drop function if exists sih26044.seed_controlled_demo_ecosystem_phase2();
drop function if exists sih26044.seed_controlled_demo_ecosystem_phase2b();
drop function if exists sih26044.controlled_demo_seed_status();

comment on schema sih26044 is
  'SIH26044 domain schema — controlled demo ecosystem seeding functions removed after production validation.';
