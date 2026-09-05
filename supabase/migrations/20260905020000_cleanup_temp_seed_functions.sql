-- Cleanup: Revoke and drop temporary controlled demo ecosystem seeding functions
-- Run after production seeding and verification is complete

-- Revoke EXECUTE before dropping
revoke execute on function sih26044.seed_controlled_demo_ecosystem() from service_role;
revoke execute on function sih26044.seed_controlled_demo_ecosystem_phase2() from service_role;
revoke execute on function sih26044.controlled_demo_seed_status() from service_role;

-- Drop temporary seeding functions
drop function if exists sih26044.seed_controlled_demo_ecosystem();
drop function if exists sih26044.seed_controlled_demo_ecosystem_phase2();
drop function if exists sih26044.controlled_demo_seed_status();

comment on schema sih26044 is 'SIH26044 domain schema - temporary seeding functions removed after demo ecosystem population';
