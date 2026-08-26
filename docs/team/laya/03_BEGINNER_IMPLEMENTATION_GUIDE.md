# Laya — Beginner Step-by-Step Implementation Guide

## 0. Complete the shared preflight first

Before editing, complete `../shared/AI_ASSISTED_IMPLEMENTATION_WORKFLOW.md`, the Windows/environment checkpoint in `../shared/GIT_BRANCH_COMMIT_PR_REVIEW_GUIDE.md`, and read `../shared/BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`. Production credentials remain with Kamal. If protected routes are unavailable locally, use only the approved controlled runtime/fixtures and record the limitation.

## 1. Prepare

Read the shared pack and your task/rules. Then run:

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/laya/student-explorer-readiness-pr1
npm ci
npm run typecheck
```

If the last command fails before your edits, save its output and tell Kamal.

Checkpoint: `node -v` is `v22.16.0`, Git shows `feature/laya/student-explorer-readiness-pr1`, baseline typecheck passes, and the AI inspection report names only allowed files. Do not continue until all four are true.

## 2. Inspect before editing

Open `domain/opportunity.ts`, `domain/readiness.ts`, Engine B output, SIH services, demo types/fixtures/reducer, `DemoPages.tsx`, `ReadinessVector.tsx` and `RequirementEvidenceMatrix.tsx`. Write a private field-to-source checklist. Ask your AI to identify reuse and proposed files; do not let it edit yet.

## 3. Build explorer first

Create only Laya-owned components. Start with fixture/runtime data already supplied. Render a list, then add explicit filters one at a time. Add the zero-result reset action. Make every card link with a stable opportunity ID. Preview after each step.

Commit: `feat(student): add opportunity explorer`

## 4. Build detail and casefile

Render requirements from typed data; do not type them again manually. Add version/source/status. Then render the canonical readiness object using existing visual components. For each requirement, show state, explanation and evidence reference. Manually test one `UNKNOWN` requirement and one supported requirement.

Commit: `feat(readiness): add student readiness casefile`

## 5. Add navigation handoffs

Add links containing identifiers only: evidence route for Manvil; plan/application route for Madhu. If shared route registration is needed, prepare the smallest diff and request Kamal's approval before committing it.

## 6. Test states and screens

Check normal, no results, no readiness, stale version, error and unauthorized states. Use keyboard only once. Resize to about 375px width. Confirm status is understandable without color.

```bash
npm run typecheck
npm run qa:opportunity-readiness
npm run qa:demo-flow
npm run qa:demo-isolation
npm run qa:sih-boundary
npm run build
```

## 7. Open Draft PR

Review `git diff`, push your branch, target integration, paste the shared checklist and include desktop/mobile/UNKNOWN screenshots. State clearly which data is controlled prototype and list any approved shared-file patch.

Success means a beginner reviewer can follow explorer → opportunity detail → version-aligned readiness casefile, understand every state without a match/hiring score, and reproduce the recorded checks. Push review corrections to the same Draft PR. Never self-merge. If blocked, send Kamal the evidence package from the shared troubleshooting guide.
