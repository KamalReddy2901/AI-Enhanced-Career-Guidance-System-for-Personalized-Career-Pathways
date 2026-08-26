# Madhu — Beginner Step-by-Step Implementation Guide

## 0. Complete the shared preflight first

Before editing, complete `../shared/AI_ASSISTED_IMPLEMENTATION_WORKFLOW.md`, the Windows/environment checkpoint in `../shared/GIT_BRANCH_COMMIT_PR_REVIEW_GUIDE.md`, and read `../shared/BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`. Production credentials remain with Kamal. Do not create `.env.local` or imitate a trusted operation with browser-only state.

## 1. Prepare

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/madhu/gap-closure-application-pr1
npm ci
npm run typecheck
```

Read every shared file and your task/rules before prompting AI.

Checkpoint: `node -v` is `v22.16.0`, Git shows `feature/madhu/gap-closure-application-pr1`, baseline typecheck passes, and the AI inspection report maps every intended write to an existing authorized method.

## 2. Inspect authority and data

Read gap/readiness/application/consent types, `SihBrowserDal`, `SihTrustedApiClient`, production recruiter projection, demo reducer/fixtures and existing `GapLearningRoutes`. Make a table: user action, method called, input identifiers, success state, failure state. If no authorized method exists, stop.

## 3. Build gap plan

Create Madhu-owned components. Render canonical gaps, group by type, then attach action cards. Each card needs requirement, reason, action category, proposed evidence/result and destination. Test `UNKNOWN`: first offer discovery/proof, not a claim that the student lacks skill.

Commit: `feat(gaps): add requirement-linked closure plan`

## 4. Build application preparation

Create checklist and disclosure preview. Populate preview only through the existing allowlisted projection. Add questionnaire fields only when typed. Let the student select permitted supporting evidence and understand why each item is shared.

Commit: `feat(application): add consented preparation workspace`

## 5. Connect consent and finalization

Use browser DAL for consent operations and trusted client for snapshot finalization. Add progress, idempotent retry, conflict, stale-version and withdrawn-consent states. Never imitate success by only changing local state when a real controlled method is expected.

Commit: `feat(application): finalize versioned application snapshot`

## 6. Verify

Manually preview gap plan, payload preview, successful controlled submission, failure and withdrawal. Use keyboard and a narrow screen.

```bash
npm run typecheck
npm run qa:opportunity-readiness
npm run qa:recruiter-projection
npm run qa:evidence-integrity
npm run qa:demo-flow
npm run qa:sih-boundary
npm run build
```

## 7. Draft PR

Target integration. Include exact test results, payload-preview screenshot, failed/withdrawn-consent screenshot, controlled-vs-live disclosure and the shared checklist. Request Laya/Harsh interface review without asking them to co-own your code.

Success means a reviewer can trace a canonical gap to an appropriate action, inspect the exact purpose-limited disclosure, and complete or safely fail the controlled consent/finalization flow. Push review corrections to the same Draft PR. Never self-merge. If blocked, send Kamal the shared evidence package.
