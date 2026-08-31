# Madhu PR1 — Gap Closure + Application Preparation

## Outcome

Turn an explainable readiness casefile into an actionable, consent-aware route to improve evidence/readiness and prepare a versioned application. Madhu owns this flow separately from Laya's explorer/casefile.

Branch: `feature/madhu/gap-closure-application-pr1`

## In scope

- Gap-closure plan grouped by evidence, capability, eligibility and logistics gaps.
- Ordered actions: `PROVE_EXISTING`, `PRACTICE`, `LEARN`, `EXPERIENCE`.
- Trace each action to an opportunity requirement and explain expected evidence/result without promising a readiness change.
- Application preparation checklist, purpose-specific consent preview, recruiter-visible payload preview and draft state.
- Explicit consent grant/withdrawal behavior through canonical contracts.
- Versioned application snapshot preparation/finalization through existing authorized DAL/client methods.
- Submitted-stage timeline and safe recovery for stale readiness/opportunity, missing consent and failed finalization.

## Out of scope

Explorer/casefile UI, implementing learning providers/LMS, verifying evidence, recruiter decisions, applicant ranking, new readiness logic, direct trusted-table writes and invented external courses/integrations.

## Milestones

### M1 — Inspect lifecycle and authority

Read gaps engine outputs, readiness/domain types, consent/application contracts, `SihBrowserDal`, `SihTrustedApiClient`, production recruiter projection, demo reducer/fixtures and existing pathway components. Document which actions are browser-authorized and which require trusted finalization.

### M2 — Gap-closure plan

Create a requirement-linked plan. Preserve the taxonomy: evidence gap suggests proving existing capability; capability gap suggests practice/learn; experience gap suggests scoped experience; eligibility/logistics blockers remain explicit. Do not turn `UNKNOWN` into a training recommendation without first offering evidence discovery/proof.

Acceptance: every recommendation identifies why, requirement, action type, completion evidence and next step; recommendations do not imply guaranteed readiness or hiring.

### M3 — Application preparation workspace

Build a checklist for opportunity version, current readiness result, required applicant inputs, questionnaire fields supported by contract, selected evidence and consent. Show a recruiter-visible preview based on the allowlisted projection; do not reconstruct it with generic object spreading.

Acceptance: private guidance fields never appear; the student can see exactly what will be disclosed and why.

### M4 — Consent and finalization

Use canonical consent methods. Require active purpose `application_review` consent before trusted snapshot finalization. Finalize via `createAndFinalizeApplicationSnapshot`; do not write snapshots directly. Represent idempotent retry, conflict, withdrawn consent and version-changed outcomes.

Acceptance: submitting produces an immutable/versioned snapshot and `applied` event through authorized paths; withdrawal visibly removes ongoing recruiter access according to the existing contract.

### M5 — State/accessibility hardening

Add no gaps, unresolved/unknown, missing readiness, blocked eligibility, draft recovery, finalization failure and unauthorized states. Validate keyboard operation, labels, error summaries, mobile order and non-color status meaning.

### M6 — Verification and PR

Run typecheck/build plus `qa:opportunity-readiness`, `qa:recruiter-projection`, `qa:evidence-integrity`, `qa:demo-flow`, `qa:sih-boundary` and relevant persistence QA when DAL calls change. Attach previews of gap plan, disclosure preview and failed/withdrawn-consent state.

## Expected files

Prefer new files under `src/app/components/sih/student/gap-closure/` and `application/`. Shared navigation/runtime wiring is integration-owned. Do not edit Laya's explorer/readiness components, Engine B, projection allowlist, migrations or Worker authority.

## Dependencies and handoffs

- From Laya: opportunity/version/readiness identifiers.
- To Manvil: route to evidence creation/verification for `PROVE_EXISTING`; do not recreate it.
- To Harsh: immutable, consent-minimized application snapshot and events only.
- Failure mode: current UI data and finalized snapshot diverge. Revalidate identifiers and show a blocking stale-state message; never submit silently.

## PR acceptance

The flow must demonstrate a gap becoming an appropriate action and a student knowingly preparing a purpose-limited application. Submission must use canonical authority, and no recommendation may function as an automatic decision.
