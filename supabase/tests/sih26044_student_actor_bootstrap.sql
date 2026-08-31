-- Test: sih26044.bootstrap_student_actor
-- Safe student self-registration RPC test

begin;
select plan(8);

-- Setup: create test auth user
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'student@test.test', crypt('password', gen_salt('bf')), now(), now(), now());

-- Test 1: Unauthenticated call fails
select throws_ok(
  'select sih26044.bootstrap_student_actor(''Test Student'');',
  'UNAUTHORIZED: bootstrap_student_actor requires authenticated session'
);

-- Test 2: Authenticated call creates actor
set local search_path = pg_catalog, sih26044, auth;
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111"}';

select lives_ok(
  'select sih26044.bootstrap_student_actor(''Test Student'');',
  'Authenticated user can bootstrap actor'
);

-- Test 3: Actor was created with correct properties
select results_eq(
  $$select count(*)::int, auth_user_id::text, display_name, status::text
    from sih26044.actors
    where auth_user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values (1, '11111111-1111-1111-1111-111111111111', 'Test Student', 'active')$$,
  'Actor created with correct properties'
);

-- Test 4: Idempotent - second call returns same actor ID
with first_call as (
  select sih26044.bootstrap_student_actor('Different Name') as actor_id
),
second_call as (
  select sih26044.bootstrap_student_actor('Yet Another Name') as actor_id
)
select is(
  (select actor_id from first_call),
  (select actor_id from second_call),
  'Repeated bootstrap calls return same actor ID (idempotent)'
);

-- Test 5: Display name unchanged on repeat call
select is(
  (select display_name from sih26044.actors where auth_user_id = '11111111-1111-1111-1111-111111111111'),
  'Test Student',
  'Display name preserved on idempotent call'
);

-- Test 6: No organization memberships created (student self-registration)
select is(
  (select count(*)::int from sih26044.organization_memberships om
   join sih26044.actors a on a.id = om.actor_id
   where a.auth_user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'Bootstrap does not create organization memberships'
);

-- Test 7: Display name fallback to email username when not provided
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('22222222-2222-2222-2222-222222222222', 'fallback@example.com', crypt('password', gen_salt('bf')), now(), now(), now());

set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222"}';
select sih26044.bootstrap_student_actor(null);

select is(
  (select display_name from sih26044.actors where auth_user_id = '22222222-2222-2222-2222-222222222222'),
  'fallback',
  'Display name falls back to email username when null provided'
);

-- Test 8: Empty string display name uses email fallback
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('33333333-3333-3333-3333-333333333333', 'empty@test.test', crypt('password', gen_salt('bf')), now(), now(), now());

set local request.jwt.claims to '{"sub": "33333333-3333-3333-3333-333333333333"}';
select sih26044.bootstrap_student_actor('   ');

select is(
  (select display_name from sih26044.actors where auth_user_id = '33333333-3333-3333-3333-333333333333'),
  'empty',
  'Empty/whitespace display name falls back to email username'
);

select * from finish();
rollback;
