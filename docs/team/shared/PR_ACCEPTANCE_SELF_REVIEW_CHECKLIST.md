# PR Acceptance and Self-Review Checklist

Copy this checklist into every PR and answer honestly.

## Scope and architecture

- [ ] PR implements only my assigned workstream and stated milestones.
- [ ] I treated PR1 as a checkpoint and did not redefine or remove ultimate v1.2 capabilities because of prototype timing.
- [ ] I reused canonical domain/service contracts and did not duplicate Engine B.
- [ ] Engine A/private guidance data does not enter readiness or recruiter views.
- [ ] `UNKNOWN` is distinct from unmet capability/eligibility/logistics states.
- [ ] No hiring probability, automatic ranking, shortlist or rejection was introduced.
- [ ] Evidence provenance and verification history remain explicit and append-only.
- [ ] Any AI assistance is reviewable and cannot silently make a high-stakes decision.
- [ ] No external integration, credential, endorsement or validation is falsely presented as live.

## Privacy, security and data

- [ ] Recruiter/verifier/institution views are purpose-limited and role-appropriate.
- [ ] Consent is explicit where disclosure or application requires it; withdrawal effects are represented.
- [ ] No direct write targets a trusted table.
- [ ] No secret, real personal data or unsafe artifact URL is committed.
- [ ] I did not request, use or expose Kamal's production credentials, dashboards, tokens or environment configuration.
- [ ] Demo data is synthetic and visibly disclosed.

## Product behavior

- [ ] Primary journey completes without editing browser storage/devtools.
- [ ] Loading, empty, error, unauthorized and stale/version-changed states are handled where relevant.
- [ ] Human decisions identify the actor, scope, state and next action.
- [ ] Buttons work; no decorative dead action is presented as functional.
- [ ] Desktop, mobile/narrow width and refresh/deep-link behavior were checked.
- [ ] Keyboard focus, labels, contrast, reduced-motion and screen-reader meaning were considered.
- [ ] Copy does not overclaim certainty or production status.

## Verification evidence

- [ ] `npm run typecheck` passed.
- [ ] `npm run build` passed.
- [ ] Relevant SIH QA scripts passed.
- [ ] Existing guidance regression checks pass if shared navigation/layout changed.
- [ ] Screenshots or a short recording cover the main flow and at least one non-happy state.
- [ ] PR description lists actual commands/results and known limitations.
- [ ] Diff contains no unrelated formatting, generated files or another owner's unapproved edits.

## Acceptance gate

Kamal should reject or return the PR if any architectural invariant is violated, required state is fake/static, controls do not work, claims are misleading, test evidence is absent, or shared-contract changes were made without approval.
