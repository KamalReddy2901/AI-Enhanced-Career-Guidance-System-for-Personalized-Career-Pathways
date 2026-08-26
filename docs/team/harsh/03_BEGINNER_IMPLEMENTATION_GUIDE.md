# Harsh — Beginner Step-by-Step Implementation Guide

## 0. Complete the shared preflight first

Before editing, complete `../shared/AI_ASSISTED_IMPLEMENTATION_WORKFLOW.md`, the Windows/environment checkpoint in `../shared/GIT_BRANCH_COMMIT_PR_REVIEW_GUIDE.md`, and read `../shared/BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`. Production credentials and employer/ATS/government connector configuration remain with Kamal; never invent or request substitutes.

## 1. Prepare

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/harsh/opportunity-authoring-recruiter-pr1
npm ci
npm run typecheck
```

Checkpoint: `node -v` is `v22.16.0`, Git shows `feature/harsh/opportunity-authoring-recruiter-pr1`, baseline typecheck passes, and the AI inspection report maps every applicant field/action to the authorized snapshot/projection and human event contract.

## 2. Inspect first

Read opportunity, skill-resolution, application and consent contracts; eligibility/readiness policy; DAL/client; production recruiter projection; demo runtime; RLS. List each screen field and action with its canonical source/authority. Stop on missing shared contracts.

## 3. Build structured authoring

Create Harsh-owned components. Implement draft sections progressively: basics, type-specific details, eligibility/logistics, requirements/evidence policy, questionnaire, review. Preserve literal source language and resolution status. Validate without hiding unresolved items.

Commit: `feat(industry): add structured opportunity authoring`

## 4. Add assistive review carefully

If a controlled extraction fixture exists, show source beside suggestions and require accept/edit/reject. Provide replay/offline disclosure. Publication/version creation must be an explicit human action.

Commit: `feat(industry): add human-confirmed requirement review`

## 5. Build recruiter workspace

List applications by stage/date. Open detail from the authorized snapshot/projection only. Add human stage actions and timeline. Test consent withdrawal and unauthorized organization membership before the happy path is considered done.

Commit: `feat(recruiter): add consent-bound applicant review`

## 6. Verify

Check authoring ambiguity, published version, applicant snapshot, human action history and denied/withdrawn states on desktop/mobile and keyboard.

```bash
npm run typecheck
npm run qa:recruiter-projection
npm run qa:opportunity-readiness
npm run qa:sih-boundary
npm run qa:demo-flow
npm run qa:evidence-integrity
npm run build
```

## 7. Draft PR

Target integration. Include authoring review, applicant detail and blocked-access screenshots; exact test results; AI/replay disclosure; and confirmation that no ranking or automatic decision exists.

Success means a reviewer can human-confirm and version an opportunity, access only a consented immutable applicant snapshot, and record an attributable human stage action without ranking or automation. Push review corrections to the same Draft PR. Never self-merge. If blocked, send Kamal the shared evidence package.
