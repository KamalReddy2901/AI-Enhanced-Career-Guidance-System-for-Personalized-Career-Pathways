-- Production acceptance cleanup: these service-role-only routines existed only
-- to construct and inspect the controlled demonstration fixture. The seeded
-- rows are authoritative data and remain untouched.
drop function if exists sih26044.seed_controlled_demo_ecosystem();
drop function if exists sih26044.seed_controlled_demo_ecosystem_phase2();
drop function if exists sih26044.seed_controlled_demo_ecosystem_phase2b();
drop function if exists sih26044.controlled_demo_seed_status();

-- bootstrap_student_actor(text) is intentionally retained. It is a legitimate
-- authenticated onboarding boundary, binds auth.uid() to exactly one actor,
-- and does not grant organization roles or accept arbitrary identity IDs.
