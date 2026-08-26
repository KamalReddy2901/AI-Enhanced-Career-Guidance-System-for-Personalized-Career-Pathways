# Nipun PR1 — Faculty Opportunity Lifecycle + Institution Action Dashboard

## Outcome

Deliver first-class faculty/academician opportunity participation and an institution dashboard that turns privacy-safe skills intelligence into accountable interventions. Faculty are not reduced to student verifiers.

Branch: `feature/nipun/faculty-institution-pr1`

## In scope

- Faculty opportunity discovery/detail/application/engagement lifecycle for industrial training, FDP, consultancy, research collaboration, mentoring, workshop/guest lecture and supported collaboration types.
- Type-specific workflow differences; do not force every collaboration into a student internship shape.
- Faculty engagement milestones, deliverables, participant/organization roles, status and outcome recording as supported by collaboration contracts.
- Institution dashboard with aggregate readiness/evidence/capability/opportunity/outcome signals supported by current analytics contracts or clearly labeled controlled fixtures.
- Action cards for interventions: evidence drives, training/cohort support, employer/faculty collaboration and opportunity outreach, each with owner/status/target/review fields where supported.
- Privacy thresholds/suppression and no identifiable student ranking.

## Out of scope

Student verifier inbox (Manvil), recruiter workspace, policy-wide production analytics, invented institutional SIS/ERP integration, causal impact claims, automatic interventions or new aggregate contracts without approval.

## Milestones

### N1 — Inspect collaboration and analytics topology

Read opportunity/collaboration/analytics/outcome/identity contracts, RLS boundaries, current fixtures/reducer and plan sections for faculty and institution experiences. Identify which fields are implemented versus controlled prototype; surface gaps rather than fabricating persistence.

### N2 — Faculty explorer and type-specific detail

Create faculty-specific discovery and detail views. Show host, format, duration, eligibility, collaboration objective, expected outputs/IP or confidentiality fields only where supported, and a truthful lifecycle/action. Preserve distinct workflows across training/FDP, consultancy/research and mentoring/workshop types.

### N3 — Faculty engagement workspace

Implement application/expression-of-interest and engagement status/milestones using existing contracts or controlled runtime. Record deliverables/outcomes as explicit human events. Link verification tasks to Manvil's surface only when faculty is acting under a scoped verifier role.

### N4 — Institution intelligence dashboard

Present aggregate counts/rates/distributions with cohort/filter context, denominator, freshness and suppression state. Separate observed facts from inference/recommendation. Never expose private Career Guidance inputs or individual candidate rankings.

### N5 — Intervention action layer

Turn an aggregate signal into a reviewable action card with rationale, target cohort, owner, status, due/review date and measured outcome where supported. Humans approve actions; analytics do not silently trigger decisions. Demonstrate at least one loop from evidence gap signal to intervention and later outcome update.

### N6 — Verification and PR

Run typecheck/build plus `qa:sih-boundary`, `qa:demo-isolation`, `qa:demo-flow`, `qa:opportunity-readiness`, `qa:evidence-integrity` and relevant persistence QA. Attach faculty lifecycle, dashboard with denominator/freshness, intervention, and suppressed/insufficient-data state.

## Expected files

Prefer `src/app/components/sih/faculty/` and `institution/`. Shared routes/fixtures/contracts require approval. Do not edit Manvil verifier components, Engine B, migrations, or recruiter/student-owned areas.

## Dependencies and handoffs

- From Harsh/shared opportunity model: published collaboration opportunity/version.
- From Manvil: scoped verifier routing only.
- From outcomes/analytics: aggregated authorized signals; do not rebuild from private client-side records.
- Failure modes: small cohort, stale/partial aggregate, missing institution membership, unsupported collaboration subtype, absent persistence contract. Suppress or label controlled behavior; never guess.

## PR acceptance

Accept only if faculty has a genuine end-to-end collaboration role beyond verification and the institution view connects aggregate signals to human-owned interventions with privacy, denominator, freshness and claim discipline.
