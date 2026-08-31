# Production Migration: Student Actor Bootstrap

**Migration:** `supabase/migrations/20260831220000_safe_student_actor_bootstrap.sql`  
**Main SHA:** `74d77d57712d7e8987269b7dee58185371e7eb8a`  
**Status:** ✅ Merged to main, CI running

## What This Migration Does

Creates the `sih26044.bootstrap_student_actor(display_name)` RPC that enables automatic student actor creation during onboarding.

**Security:**
- Auth-derived (auth.uid() source of truth)
- Idempotent (safe retry)
- Learner-only (no trusted roles)
- No organization affiliation

## How to Apply to Production Supabase

### Option 1: Supabase Dashboard (Recommended)

1. Open https://supabase.com/dashboard/project/mmwgnsggnllwgshipnwh/sql/new
2. Copy the entire contents of `supabase/migrations/20260831220000_safe_student_actor_bootstrap.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify: `SELECT proname FROM pg_proc WHERE proname = 'bootstrap_student_actor';`
   - Should return 1 row

### Option 2: Supabase CLI

```bash
# Link project (one-time)
supabase link --project-ref mmwgnsggnllwgshipnwh

# Push migration
supabase db push

# Or apply specific migration
supabase db execute --file supabase/migrations/20260831220000_safe_student_actor_bootstrap.sql --linked
```

## Verification

After applying, test with authenticated session:

```sql
-- Should return a UUID (your actor ID)
SELECT sih26044.bootstrap_student_actor('Test Student');

-- Verify actor created
SELECT id, display_name, status, created_at 
FROM sih26044.actors 
WHERE auth_user_id = auth.uid();
```

## Rollback (if needed)

```sql
DROP FUNCTION IF EXISTS sih26044.bootstrap_student_actor(text);
```

## What Happens After Migration

1. Existing users: No change (idempotent RPC checks before INSERT)
2. New signups: Automatic actor creation when onboarding completes
3. SihActorOnboarding retry: Will now succeed for students

## Next Step

After migration applied:
- Wait for Cloudflare Pages to deploy main SHA `74d77d5`
- Execute complete BrowserOS Neo production validation
- Test new student signup → onboarding → actor bootstrap → workspace access
