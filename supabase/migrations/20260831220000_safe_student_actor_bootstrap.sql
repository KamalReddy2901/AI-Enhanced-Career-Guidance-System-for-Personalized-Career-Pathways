-- SIH26044 Safe Student Actor Bootstrap
-- Creates a trusted RPC for automatic student actor creation during onboarding.
-- Security invariants:
-- 1. Idempotent: repeated calls harmless
-- 2. Auth-derived: auth.uid() is source of truth, browser cannot forge actor identity
-- 3. Learner-only: creates ONLY learner role, never trusted roles (recruiter/faculty/institution)
-- 4. Self-registration: no organization affiliation
-- 5. Auditable: all actor creations logged with created_at timestamp
-- 6. RLS-safe: uses SECURITY DEFINER with minimal privilege
-- 7. Existing actors preserved: function returns existing actor if auth_user_id already mapped

create or replace function sih26044.bootstrap_student_actor(
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, sih26044
as $$
declare
  v_auth_user_id uuid;
  v_actor_id uuid;
  v_final_display_name text;
begin
  -- Resolve authenticated user
  v_auth_user_id := auth.uid();
  
  if v_auth_user_id is null then
    raise exception 'UNAUTHORIZED: bootstrap_student_actor requires authenticated session';
  end if;

  -- Validate and sanitize display name
  v_final_display_name := btrim(coalesce(p_display_name, ''));
  if length(v_final_display_name) < 1 then
    -- Fallback to email username if no display name provided
    select split_part(au.email, '@', 1)
    into v_final_display_name
    from auth.users au
    where au.id = v_auth_user_id;
    
    if v_final_display_name is null or length(v_final_display_name) < 1 then
      v_final_display_name := 'Student';
    end if;
  end if;

  -- Check if actor already exists for this auth user
  select a.id
  into v_actor_id
  from sih26044.actors a
  where a.auth_user_id = v_auth_user_id;

  if v_actor_id is not null then
    -- Idempotent: return existing actor ID
    return v_actor_id;
  end if;

  -- Create new actor (learner self-registration)
  insert into sih26044.actors (
    auth_user_id,
    display_name,
    status,
    created_at
  )
  values (
    v_auth_user_id,
    v_final_display_name,
    'active',
    statement_timestamp()
  )
  returning id into v_actor_id;

  return v_actor_id;
end;
$$;

-- Privilege discipline: authenticated users can bootstrap their own actor
revoke all on function sih26044.bootstrap_student_actor(text) from public;
grant execute on function sih26044.bootstrap_student_actor(text) to authenticated;

comment on function sih26044.bootstrap_student_actor is
  'Safe student actor bootstrap. Creates actor row for authenticated user with learner-only authority. Idempotent: returns existing actor if auth_user_id already mapped. Never grants organization roles or trusted authority.';
