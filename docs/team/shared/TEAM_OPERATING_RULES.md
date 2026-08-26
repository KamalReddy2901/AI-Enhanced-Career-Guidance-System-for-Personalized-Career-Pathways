# Shared Team Operating Rules

## One product, five bounded workstreams

Every PR must extend the same evidence-backed Opportunity Readiness and Skills Intelligence loop. Do not build an isolated mini-product, duplicate a domain model, or change settled architecture for local convenience.

PR1 is an implementation checkpoint, not a reduced definition of CareerCase. Prototype pressure may change build order or what is demonstrated first; it must never redefine the ultimate v1.2 architecture. Do not delete, label “out of scope forever,” or design against full stakeholder lifecycles, policy analytics, accessibility, localization, low-bandwidth support, production tenancy/security, background operations or integration adapters merely because they are not owned in this PR.

## Non-negotiable product rules

- Keep Engine A (Career Guidance) separate from Engine B (Opportunity Readiness).
- Treat `UNKNOWN` as missing knowledge/evidence, never as `UNSKILLED` or an automatic gap.
- Use the canonical deterministic, explainable, versioned readiness implementation. Never create a second scorer.
- Never label readiness as hiring probability, match probability, employability score, candidate rank or automatic rejection.
- Do not automatically reject, shortlist or rank people. Recruitment and verification decisions remain human actions.
- Recruiter-visible data must be purpose-specific, consented and minimized.
- Never expose RIASEC, values, private aspirations, counselor history, financial constraints or guardian data to Engine B, recruiter payloads or applicant comparison.
- Preserve evidence provenance. Verification status is separate from evidence type; weak evidence never upgrades in place into issuer-grade evidence.
- Human and issuer verification events are append-only, scoped, attributable and auditable.
- Resolve high-stakes skill language conservatively. If unresolved, display literal language and an unresolved state; do not guess.
- External systems are only `implemented`, `controlled prototype`, `integration-ready` or `target architecture`. Never invent credentials, live APIs, endorsements or validation.
- Accessibility, localization and low-bandwidth behavior are product requirements, not optional polish.

## Working rules

- Branch from `integration/sih26044-product-v0.2`, never Foundation or `main`.
- One owner per workstream; ask before editing another owner's files.
- Open a Draft PR after the first coherent vertical slice, not after the entire workstream is finished.
- Keep commits small, descriptive and reversible. Do not mix formatting sweeps with behavior.
- Inspect existing code before creating any new type, service or component.
- Reuse domain contracts and design primitives; do not copy-paste business logic into pages.
- Never edit frozen migrations `001`–`012`. Any schema change requires Kamal's explicit architectural review and a forward-only migration.
- Never commit secrets, `.env` files, generated credentials, personal data or real applicant evidence.
- Production credentials, Supabase/Cloudflare dashboards, service-role keys, API secrets, deployment tokens and production environment configuration remain with Kamal. Teammates must not request, copy, create substitutes for, or place them in AI tools, terminal output, screenshots, issues or PRs.
- Use only synthetic demo fixtures and label them clearly.
- Record any controlled behavior or missing external dependency in the UI and PR description.

## Stop-and-escalate conditions

Stop and ask Kamal before proceeding if work requires a shared domain type change, Engine B change, trusted Worker/RPC change, schema migration, route ownership collision, prohibited private data, automatic decision logic, or an unapproved external integration claim.

When blocked, follow `BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`. “It is not working” is not enough evidence for diagnosis.

## Definition of done

A PR is done only when its complete user journey works locally, empty/loading/error/permission states exist, keyboard and narrow-screen use are checked, required QA passes, controlled limitations are truthful, and the PR contains evidence for review.
