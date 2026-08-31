# SIH26044 integration status

Last updated: 2026-08-31

This is the current repository status ledger after PRs #61 and #62. Earlier
checkpoint documents are historical and must not be read as the current
implementation state.

## Implemented

- Separate Engine A guidance and Engine B production provider graphs.
- Isolated `/demo/*` Controlled Reference Implementation.
- Role-aware production routes for students, industry, faculty and institutions.
- Versioned deterministic opportunity-readiness engine and requirement explanations.
- Conservative skill resolution with durable `resolved`, `review_required`, and `unresolved` persistence.
- Literal requirement wording preservation; review suggestions are non-authoritative.
- Append-only, scoped verification and organization-backed verifier authority.
- Purpose-specific application-review consent and recruiter projection allowlisting.
- Exact immutable snapshot binding on the append-only transition to `applied`.
- Full student and recruiter application/recruitment lifecycle records: evidence requests and responses, screening, interview, shortlist, rejection reason, offer, outcome, feedback and history; human-only stages with no hiring probability, automatic rejection or opaque ranking.
- Published opportunity-version immutability.
- Faculty/industry collaboration lifecycle events for approval, activation, milestones, deliverables, feedback, completion and bounded outcomes; event history is append-only and actor-attributed.
- Provider-neutral connector runtime framework with explicit configuration, capabilities, provenance, pagination, dedupe, reconciliation, retry/backoff, cursors, disconnect state, health and controlled NOOP adapters; external providers remain integration-ready.
- Provider-neutral notification events/outbox and background-operation semantics with preferences, minimized references, leases, idempotency, bounded retries and dead-state reconciliation.
- Request/correlation IDs, privacy-safe structured error boundaries, `/healthz`, security headers, size/rate/CORS controls, accessibility static checks, localization catalogs and deterministic demo/replay documentation.
- Hosted Supabase schema migrations through `submission_trigger_lock_authority`.
- Trigger-only database functions removed from direct `PUBLIC`, `anon`, and `authenticated` execution.
- Trusted Cloudflare Worker authentication, bounded public errors, 64 KiB request limit and per-caller/path rate limiting configuration.
- Credential-gated semantic migration audit, controlled two-tenant authority fixture, reversible suspension, authenticated authority smoke matrix, and preview/production deployment drivers, with no browser access to privileged credentials.

## Controlled prototype

- `/demo/*` role journeys and synthetic fixtures.
- Existing Engine A assessments and recommendations pending formal psychometric and field validation.
- Production workspace presentation while the authenticated production-path fixture is not provisioned.

## Integration-ready

- External NCS, SIDH, AICTE Internship Portal, NATS/NAPS, DigiLocker/NAD, APAAR/ABC, SIS/ERP, ATS and learning/certification provider boundaries. The runtime framework is implemented; named providers are `INTEGRATION-READY` or `TARGET ARCHITECTURE` pending approved credentials/contracts.
- Institution aggregate intelligence surfaces. Current production pages enforce a minimum display threshold; dedicated materialized aggregate RPCs remain future hardening.

## Known limitations / blockers

- The hosted SIH schema has no provisioned actor identities. Creating authenticated role accounts requires approved test email addresses/password handling or Auth admin credentials not exposed to this workspace.
- Leaked-password protection must be enabled in Supabase Auth configuration; the database connector cannot mutate this Auth setting.
- Browser-level production role-isolation, cross-tenant, consent and screen-reader regression is not yet automated; local deterministic browser smoke and automated static accessibility checks are documented.
- Cloudflare preview and production deployment require the account's deployment credentials and configured Worker secrets.
- Hosted migration reconciliation, controlled identity provisioning, authenticated role smoke testing, hosted restore validation and deployment remain unexecuted because this workspace has no approved Supabase Auth-admin/service credentials or Cloudflare deployment credentials. The repeatable operator procedure is documented in `docs/sih26044-hosted-validation-runbook.md` and `docs/sih26044-operations-runbook.md`.
- `careercase.pages.dev` remains the legacy deployment until preview and authenticated smoke gates pass.

## Claim boundaries

Safe: implemented database foundation; controlled prototype journeys; deterministic and versioned readiness; purpose-limited recruiter projection; exact submission snapshot auditability; integration-ready external boundaries.

Unsafe: live government integrations; AIIA/Ministry endorsement; validated hiring prediction; bias-free algorithms; government-production readiness; completed representative field validation; integrated SIH26044 production deployment.
