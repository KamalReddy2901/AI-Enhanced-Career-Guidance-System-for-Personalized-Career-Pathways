# SIH26044 integration status

Last updated: 2026-08-30

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
- Human-only recruitment stages; no hiring probability, automatic rejection or opaque ranking.
- Published opportunity-version immutability.
- Faculty/industry collaboration lifecycle events for approval, activation, milestones, deliverables, feedback, completion and bounded outcomes; event history is append-only and actor-attributed.
- Hosted Supabase schema migrations through `submission_trigger_lock_authority`.
- Trigger-only database functions removed from direct `PUBLIC`, `anon`, and `authenticated` execution.
- Trusted Cloudflare Worker authentication, bounded public errors, 64 KiB request limit and per-caller/path rate limiting configuration.
- Credential-gated semantic migration audit, controlled two-tenant authority fixture, reversible suspension, authenticated authority smoke matrix, and preview/production deployment drivers, with no browser access to privileged credentials.

## Controlled prototype

- `/demo/*` role journeys and synthetic fixtures.
- Existing Engine A assessments and recommendations pending formal psychometric and field validation.
- Production workspace presentation while the authenticated production-path fixture is not provisioned.

## Integration-ready

- External NCS, SIDH, AICTE, NATS/NAPS, DigiLocker/NAD, APAAR/ABC, SIS/ERP and ATS boundaries.
- Institution aggregate intelligence surfaces. Current production pages enforce a minimum display threshold; dedicated materialized aggregate RPCs remain future hardening.

## Known limitations / blockers

- The hosted SIH schema has no provisioned actor identities. Creating authenticated role accounts requires approved test email addresses/password handling or Auth admin credentials not exposed to this workspace.
- Leaked-password protection must be enabled in Supabase Auth configuration; the database connector cannot mutate this Auth setting.
- Browser-level keyboard, responsive and screen-reader regression is not yet automated.
- Cloudflare preview and production deployment require the account's deployment credentials and configured Worker secrets.
- Hosted migration reconciliation, controlled identity provisioning, authenticated role smoke testing and deployment remain unexecuted because this workspace has no approved Supabase Auth-admin/service credentials or Cloudflare deployment credentials. The repeatable operator procedure is documented in `docs/sih26044-hosted-validation-runbook.md`.
- `careercase.pages.dev` remains the legacy deployment until preview and authenticated smoke gates pass.

## Claim boundaries

Safe: implemented database foundation; controlled prototype journeys; deterministic and versioned readiness; purpose-limited recruiter projection; exact submission snapshot auditability; integration-ready external boundaries.

Unsafe: live government integrations; AIIA/Ministry endorsement; validated hiring prediction; bias-free algorithms; government-production readiness; completed representative field validation; integrated SIH26044 production deployment.
