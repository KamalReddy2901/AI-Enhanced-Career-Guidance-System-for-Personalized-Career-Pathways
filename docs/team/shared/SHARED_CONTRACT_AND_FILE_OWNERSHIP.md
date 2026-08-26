# Shared Contracts and File Ownership

## Frozen/shared surfaces

These require Kamal's explicit approval before editing:

- `src/app/domain/**`
- `src/app/engine/**`, especially `opportunityReadiness.ts`
- `src/app/services/sih/**`
- `worker/**`
- `supabase/migrations/**` and `supabase/tests/**`
- shared routing/layout files: `src/app/routes.ts`, `src/app/App.tsx`, `src/app/demo/DemoLayout.tsx`, `src/app/demo/DemoSihRuntime.tsx`
- cross-role fixtures/reducer contracts in `src/app/demo/demoTypes.ts`, `demoFixtures.ts`, `demoReducer.ts`, `demoScenario.ts`
- global styles and generic UI primitives.

Request a tiny integration-owned patch when a shared route registration or fixture field is unavoidable. Do not casually bundle shared edits into a feature PR.

## Owner-controlled feature areas

Use new role-specific directories to minimize collisions:

| Owner | Preferred new UI directory | Preferred route prefix |
|---|---|---|
| Laya | `src/app/components/sih/student/explorer/**`, `.../readiness/**` | `/student/opportunities`, `/student/opportunities/:id/readiness` |
| Madhu | `src/app/components/sih/student/gap-closure/**`, `.../application/**` | `/student/opportunities/:id/plan`, `/student/applications/**` |
| Manvil | `src/app/components/sih/evidence/**`, `.../verification/**` | `/student/evidence`, `/verify/**` |
| Harsh | `src/app/components/sih/industry/**`, `.../recruiter/**` | `/industry/opportunities/**`, `/recruiter/applications/**` |
| Nipun | `src/app/components/sih/faculty/**`, `.../institution/**` | `/faculty/**`, `/institution/**` |

Exact component names may change after inspection; ownership boundaries may not.

## Canonical contracts to reuse

- Opportunity: `src/app/domain/opportunity.ts`.
- Readiness: `src/app/domain/readiness.ts` and the single Engine B implementation.
- Evidence/provenance: `src/app/domain/evidence.ts`.
- Consent: `src/app/domain/consent.ts`.
- Application/events: `src/app/domain/application.ts`.
- Collaboration/faculty: `src/app/domain/collaboration.ts`.
- Outcomes/analytics: `src/app/domain/outcome.ts`, `analytics.ts`.
- Browser-authorized operations: `SihBrowserDal`.
- Trusted operations: `SihTrustedApiClient` only for its documented methods.
- Recruiter-safe projection: `buildProductionRecruiterProjection()`.

## Cross-owner handoffs

- Laya exposes navigation context (`opportunityId`, version/readiness identity), not copied readiness objects.
- Madhu consumes readiness/gap states and produces application-preparation state through canonical application/consent contracts.
- Manvil owns evidence and verification UI conventions; other owners link into them instead of recreating workflows.
- Harsh owns authoring and recruiter human-review surfaces; student owners do not implement recruiter decisions.
- Nipun owns faculty lifecycle and institution aggregate/action surfaces; no one exposes identifiable student data in analytics without a defined purpose and authorization.

## Shared-change request format

In the PR, write: current limitation, proposed minimal contract change, affected owners, privacy/security impact, backward compatibility, test plan and migration impact. Wait for Kamal's approval before implementation.
