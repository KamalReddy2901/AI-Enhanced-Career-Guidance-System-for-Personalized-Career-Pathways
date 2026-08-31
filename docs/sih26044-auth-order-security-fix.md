# SIH26044 Auth-Before-Validation Security Fix

**Status**: COMPLETE ✅  
**Date**: 2026-08-31  
**Integration SHA**: `baa43a3`  
**PR**: #67  

## Security Defect

Post-deploy smoke testing of SHA `29447f3` revealed that protected SIH Worker routes returned:
- **400** for request-body validation failures BEFORE checking authentication
- This disclosed protected endpoint validation behavior to unauthenticated callers

## Fix

Implemented early authentication gate for all protected production routes:

1. **Request-scoped auth caching** via WeakMap to avoid duplicate lookups
2. **Protected route registry** (`protectedRouteKeys` Set) identifying auth-required endpoints
3. **Auth-before-parse ordering**: authenticate → resolve actor → parse/validate body

### Protected Routes

All routes in `protectedRouteKeys` now authenticate before parsing request bodies:
- `POST /sih/readiness/recompute`
- `PUT /sih/readiness/subject-facts`
- `POST /sih/readiness/evidence-projections`
- `POST /sih/artifacts/register`
- `POST /sih/evidence/derive-artifact-backed`
- `POST /sih/applications/snapshot`
- `POST /sih/questionnaires/create`
- `POST /sih/questionnaires/successor`
- `PUT /sih/questionnaires/draft`
- `POST /sih/questionnaires/attach`
- `POST /sih/questionnaires/publish`
- `POST /sih/questionnaires/submit`

## Testing

### Local Validation
- ✅ Worker tests: 37/37 passing
- ✅ TypeScript validation
- ✅ All SIH premerge QA gates
- ✅ Production build
- ✅ Playwright E2E: 15/15 passing

### CI Validation (PR #67)
- ✅ Cloudflare Worker (23s)
- ✅ Client and guidance engine (1m27s)
- ✅ Disposable Supabase D2 Foundation (2m12s)
- ✅ Browser E2E and accessibility (2m29s)
- ✅ Cloudflare Pages

### Exact-SHA CI (baa43a3)
- ✅ CI Workflow #33391004042 - all 4 jobs passed
- ✅ Database Security Workflow #33391035469 - passed

### Post-Deploy Security Smoke
✅ **ORIGINAL DEFECT FIXED**

Tested against deployed Worker: https://careercaseai.kamalreddi2901.workers.dev

```bash
# Unauthenticated malformed request
curl -X POST https://careercaseai.kamalreddi2901.workers.dev/sih/readiness/recompute \
  -H "Content-Type: application/json" \
  -d '{"malformed": "body"}'
  
# Result: 401 UNAUTHENTICATED (not 400 validation error) ✅
```

Additional protected routes verified:
- `/sih/readiness/evidence-projections` → 401 ✅
- `/sih/artifacts/register` → 401 ✅
- `/sih/applications/snapshot` → 401 ✅
- Invalid Authorization header → 401 ✅

### Security Invariant

**Unauthenticated requests to protected routes now return 401 immediately, regardless of request body validity. Protected validation details are never exposed before authentication succeeds.**

## Deployment

### Worker
- **URL**: https://careercaseai.kamalreddi2901.workers.dev
- **Version ID**: 9fce81e5-e950-415a-a6f5-960c8c99157a
- **Deployed**: 2026-08-31 12:12 UTC

### Pages
- **Production Alias**: https://integration.careercase.pages.dev
- **Deployment URL**: https://1fff5461.careercase.pages.dev
- **Deployed**: 2026-08-31 12:13 UTC

### Hosted Smoke
- ✅ Homepage loads (200)
- ✅ `/demo` loads (200)
- ✅ `/demo/student` loads (200)
- ✅ `/demo/recruiter` loads (200)
- ✅ Demo reset QA passes (deterministic behavior verified)

## Files Changed

- `worker/src/sih/auth.ts` - Added `authenticateAndResolveActor()` with caching
- `worker/src/sih/routes.ts` - Added early auth gate for protected routes
- `worker/test/sihRoutes.test.mjs` - Added regression test

## Security Review

✅ **Auth-before-validation ordering enforced**  
✅ **Request-scoped caching prevents double lookup**  
✅ **Protected routes return 401 before parsing body**  
✅ **Authenticated malformed requests still receive 400 validation errors**  
✅ **Public routes remain public (no accidental auth requirement)**  
✅ **CORS behavior unchanged**  
✅ **No secrets leaked in error messages**  

## Remaining Work

This fix completes the immediate post-deploy security defect. No additional security-critical work remains for this specific issue.

For the broader v1.2 completion, remaining items are documented in:
- `docs/sih26044-v1.2-implementation-status.md`
- Master execution plan attachments

## Sign-Off

**Security defect**: FIXED ✅  
**Post-deploy verification**: PASSED ✅  
**Hosted deployment**: COMPLETE ✅  
**Ready for**: Production golden-path smoke testing and demo freeze
