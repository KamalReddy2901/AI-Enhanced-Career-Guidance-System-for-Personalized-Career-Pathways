# Onboarding Redirect Fix

## Problem
After logging in with Google (or any authentication method), users were being redirected directly to `/dashboard` **regardless of whether they had completed onboarding**. This meant new users skipped the initial setup flow where they select their segment (school student, college student, job seeker, career switcher, or professional) and configure their Career Passport.

## Root Cause
In `src/app/pages/AuthPage.tsx`, the post-login redirect logic was hardcoded to `/dashboard`:

```typescript
// OLD CODE
const redirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
  ? requestedRedirect
  : '/dashboard';  // ❌ Always went to dashboard

useEffect(() => {
  if (!loading && user) {
    navigate(redirect, { replace: true });
  }
}, [user, loading, navigate, redirect]);
```

## Solution
Modified `AuthPage.tsx` to check if a Career Passport exists before deciding where to redirect:

```typescript
// NEW CODE
const getDefaultRedirect = () => {
  if (requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')) {
    return requestedRedirect;  // Honor explicit redirect requests
  }
  // Check if passport exists - if not, redirect to onboarding
  return passport ? '/dashboard' : '/onboarding';  // ✅ Smart routing
};

useEffect(() => {
  if (!loading && !guidanceLoading && user) {
    const redirect = getDefaultRedirect();
    navigate(redirect, { replace: true });
  }
}, [user, loading, guidanceLoading, passport, navigate]);
```

## Technical Changes

### File: `src/app/pages/AuthPage.tsx`

1. **Added GuidanceContext import** to access passport state:
   ```typescript
   import { useGuidance } from '../context/GuidanceContext';
   const { passport, loading: guidanceLoading } = useGuidance();
   ```

2. **Created smart redirect function** that checks passport existence:
   ```typescript
   const getDefaultRedirect = () => {
     if (requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')) {
       return requestedRedirect;
     }
     return passport ? '/dashboard' : '/onboarding';
   };
   ```

3. **Updated useEffect** to wait for both auth AND guidance loading:
   ```typescript
   useEffect(() => {
     if (!loading && !guidanceLoading && user) {
       const redirect = getDefaultRedirect();
       navigate(redirect, { replace: true });
     }
   }, [user, loading, guidanceLoading, passport, navigate]);
   ```

4. **Fixed sign-in handler** to let useEffect handle navigation:
   ```typescript
   // Removed immediate navigate() call after successful sign-in
   // Now waits for useEffect to trigger after passport loads
   ```

5. **Fixed Google OAuth redirect** to use correct variable:
   ```typescript
   await signInWithGoogle(requestedRedirect ?? undefined);
   ```

## User Flow

### New User (No Passport)
1. Sign in with Google → Auth succeeds
2. `passport` is `null`
3. Redirected to `/onboarding`
4. User selects segment, configures profile, consents
5. Passport created → Can proceed to dashboard

### Returning User (Has Passport)
1. Sign in with Google → Auth succeeds
2. `passport` exists (loaded from localStorage/Supabase)
3. Redirected to `/dashboard`
4. Sees dashboard with completeness breakdown and next steps

### Explicit Redirect Request
1. User tries to access `/recommendations` without auth
2. Redirected to `/auth?redirect=/recommendations`
3. After login, goes directly to `/recommendations` (honors request)

## Why This Matters

**Before:** New users hit the dashboard with no context, saw "Create your Career Passport" button, and had to manually discover the onboarding flow.

**After:** New users land directly on onboarding, where they're guided through segment selection, profile setup, and consent in a structured flow.

## Testing Checklist

- [x] TypeScript compilation passes
- [x] Production build succeeds (5.01s)
- [ ] Test new user flow: Sign up → Should land on onboarding
- [ ] Test returning user: Sign in → Should land on dashboard
- [ ] Test explicit redirect: Visit `/recommendations` logged out → Auth → Should land on `/recommendations`
- [ ] Test Google OAuth: Sign in with Google → New user goes to onboarding
- [ ] Verify localStorage passport detection works
- [ ] Verify Supabase passport sync works

## Edge Cases Handled

1. **Race condition**: Waits for both `loading` and `guidanceLoading` to be false before redirecting
2. **Explicit redirects**: Preserves `?redirect=/path` parameter and honors it
3. **Google OAuth**: Passes redirect to OAuth flow for post-callback navigation
4. **Passport loading**: Only makes decision after passport state is known

## Build Status

✅ TypeScript: **PASS**  
✅ Production build: **PASS** (5.01s, 4.5 MB)  
✅ No breaking changes

---

**Date:** August 17, 2026  
**Issue:** Users skipping onboarding after Google sign-in  
**Status:** ✅ Fixed and ready for testing
