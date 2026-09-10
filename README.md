# CareerCase × SIH26044

**Evidence-backed Opportunity Readiness & Skills Intelligence for the academia–industry ecosystem.**

[![Public deployment](https://img.shields.io/badge/careercase.pages.dev-open-000)](https://careercase.pages.dev/)
[![CI](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/actions/workflows/ci.yml/badge.svg)](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

**[Open CareerCase →](https://careercase.pages.dev/)**

![CareerCase home page](./others/presentation-assets/homepage.jpg)

CareerCase is the repository's response to **SIH26044 — Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement**. It extends the original career-guidance product into an evidence-backed coordination layer connecting students, faculty, institutions and industry—without becoming a generic job board, LMS, ATS or AI chatbot.

> CareerCase does not ask only, “Which career might fit?” It also asks, “What does this opportunity require, what can the person currently prove, what remains unknown, and what is the safest next action?”

The target closed loop is:

`Career Passport → Career Direction → Opportunity → Opportunity Readiness → Explainable Gap → Prove / Practice / Learn / Experience → Verification → Consented Application → Human Recruitment / Collaboration → Outcome → Updated Evidence → Institution / Industry Skills Intelligence → Intervention`

## Product model

CareerCase deliberately keeps two engines separate:

| Engine | Question answered | Inputs and boundary |
|---|---|---|
| **Engine A — Career Guidance** | “Which career directions may fit me, and why?” | Interests, aptitude signals, work values, aspirations, skills and constraints. These private guidance inputs stay out of recruiter scoring and disclosure. |
| **Engine B — Opportunity Readiness** | “What does this specific, versioned opportunity require, and what evidence supports each requirement?” | Purpose-relevant eligibility facts, requirement-level evidence, experience, work samples and logistics. Output is deterministic, explainable and versioned. |

Engine B produces a readiness casefile, not a hiring prediction. `UNKNOWN ≠ UNSKILLED`: missing or unresolved evidence remains unknown rather than being converted into a negative skill judgment. A readiness band is never a probability of selection, candidate rank or automatic rejection signal.

## What is implemented

The current `main` branch contains the unified product code and production-path boundaries.

### Student

- Career Passport, four exploratory assessments and the explainable 11-component Career Guidance engine.
- Versioned opportunity discovery and detail views.
- Requirement-by-requirement Opportunity Readiness with eligibility, evidence strength, experience, logistics and explainable gap states.
- Gap-closure actions across **Prove, Practice, Learn and Experience**.
- Evidence records, private artifact upload/registration, scoped verification requests and visible history.
- Employer questionnaires whose scored outputs remain bounded evidence—not silent eligibility or recruitment decisions.
- Purpose-specific recruiter disclosure preview, consent grant/withdrawal, immutable application snapshot and application/outcome history.

### Faculty / academicians

- Scoped evidence-verification inbox and attributable, append-only decisions.
- Faculty internships, industrial training, FDPs, consultancy, research collaboration, mentoring and workshops represented as first-class engagements.
- Collaboration proposal, approval, activation, milestone, deliverable, feedback and completion lifecycles.

### Recruiters / industry

- Draft, edit, version and publish opportunities with conservative skill resolution; unresolved high-stakes language remains literal for human review.
- Author and attach versioned questionnaires.
- Review only the applicant data covered by active, purpose-specific consent.
- Record human-owned screening, evidence requests, interviews, shortlist/rejection reasons, offers, outcomes and feedback.
- View privacy-protected industry skills intelligence rather than opaque candidate rankings.

### Institutions / T&P / skills cells

- Aggregate skills/readiness intelligence with minimum-cell suppression.
- Institution interventions and development-program authoring linked conservatively to resolved requirements.
- Collaboration and outcome signals that can inform curriculum, training and placement support.

### Authorized policy / program analysts

- Institution/program-scoped, aggregate-only skills intelligence.
- No student drill-down, recruiter notes, private guidance data or operational institution authority.

## Current-state truth

| Status | What it means in this repository |
|---|---|
| **Implemented in code** | Separate Engine A/Engine B provider graphs; role-aware product routes; deterministic readiness; evidence, verification, consent, application and collaboration contracts; Supabase migrations/RLS; trusted Worker endpoints; human-owned recruitment events; analytics privacy thresholds; connector and operations frameworks. |
| **Controlled prototype** | `/demo/*` and presentation journeys use controlled personas/fixtures for deterministic, repeatable review. Engine A assessments are exploratory and have not undergone formal psychometric or representative field validation. |
| **Integration-ready** | Provider-neutral boundaries exist for NCS, Skill India Digital Hub, AICTE Internship Portal, NATS/NAPS, DigiLocker/NAD, APAAR/ABC, SIS/ERP, employer ATSs and learning/certification providers. Named live connectors require approved contracts, credentials and source-specific validation. |
| **Not yet proven as production-complete** | Hosted schema reconciliation, provisioned multi-role identities, authenticated cross-tenant/consent smoke tests, restore/incident exercises, formal DPDP/legal review, manual screen-reader validation and representative field validation remain operator- or partner-gated. |

The public URL is [careercase.pages.dev](https://careercase.pages.dev/). It is the product's deployment address, but the repository does **not** claim that every current SIH26044 production-path migration, role fixture or external integration has been validated live there. See [`docs/sih26044-integration-status.md`](./docs/sih26044-integration-status.md) and the [`hosted validation runbook`](./docs/sih26044-hosted-validation-runbook.md) for the evidence boundary.

## Trust, privacy and fairness invariants

- **No automatic rejection or opaque ranking.** Recruiter, faculty, verifier, institution and program decisions remain human-owned and attributable.
- **Readiness is not hiring probability.** It describes evidence against one immutable opportunity version.
- **Unknown is not unskilled.** Missing, disputed or unresolved information stays explicit.
- **Consent is purpose-specific and revocable.** Applications use a minimized recruiter projection rather than exposing the full Career Passport.
- **Private guidance remains private.** RIASEC, work values, private aspirations, counselor history, financial constraints and guardian data are prohibited from recruiter/readiness payloads.
- **Provenance and verification are separate.** Self-declared, assessed, artifact-backed, human-attested and issuer-origin evidence are not interchangeable; repeated weak evidence cannot mathematically become issuer-grade evidence.
- **Verification is contextual.** A verifier attests only within a defined scope and authority; events are append-only and auditable.
- **Canonicalization is conservative.** Unresolved skill language remains literal until a human-authoritative mapping is available.
- **Deterministic means auditable, not unbiased.** Formal fairness, accessibility, privacy and field validation are continuing requirements, not assumed properties.

## Architecture

```text
React / TypeScript / Vite client
├── Engine A: private Career Guidance
├── Engine B: versioned Opportunity Readiness
├── Student, faculty, industry, institution and policy views
└── Isolated controlled demo / presentation runtime
        │
        ├── user-context reads and direct private uploads
        ▼
Supabase Auth + PostgreSQL + Storage
├── tenant- and role-scoped RLS
├── append-only evidence, verification, application and collaboration events
├── immutable opportunity/readiness/application versions
└── private evidence artifacts
        ▲
        ├── bearer-authenticated trusted operations
        │
Cloudflare Worker
├── canonical Engine B recomputation
├── artifact registration and SHA-256 integrity checks
├── purpose-limited application snapshots
├── trusted questionnaire operations
└── optional Groq-backed assistive AI gateway
```

AI may assist extraction, authoring, explanation, multilingual interaction and practice. It does not silently set eligibility, verification, readiness bands, shortlist or rejection. Core readiness and guidance conclusions come from versioned TypeScript rules and explicit evidence contracts.

## Demo and presentation modes

- `/presentation` is the reviewer-facing entry point for the unified product.
- `/demo/*` is an isolated controlled reference journey with synthetic people, organizations and events.
- Production-path routes use authenticated Supabase/Worker boundaries and do not silently fall back to demo providers.

Controlled fixtures are evidence that the product flow is demonstrable; they are not claims of live employer postings, institutional adoption, government integration or endorsement.

## Run locally

### Prerequisites

- Node.js `22.16.0` (see [`.node-version`](./.node-version))
- npm

### Install and start

```bash
git clone https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways.git
cd AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways
npm ci
cp .env.example .env.local
npm run dev
```

The controlled demo and browser-local Career Guidance flow work without privileged credentials. Account-backed production routes require an appropriately migrated Supabase project and the trusted Worker boundary; follow [`docs/sih26044-hosted-validation-runbook.md`](./docs/sih26044-hosted-validation-runbook.md) instead of treating `.env.example` as a complete production deployment guide.

Browser-visible environment variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key
VITE_WORKER_URL=https://your-worker.workers.dev
VITE_AI_PROXY_URL=https://your-worker.workers.dev
```

Never place service-role keys, elevated Supabase keys or AI provider secrets in `VITE_*` variables. Worker secrets are configured server-side.

### Useful checks

```bash
npm run typecheck
npm run qa:sih-premerge

cd worker
npm ci
npm test
npx tsc --noEmit
```

`qa:sih-premerge` includes deterministic domain checks, privacy-boundary checks, production convergence checks, a client build and browser E2E tests. Database security and clean migration replay run in GitHub Actions using a disposable local Supabase environment.

## Repository map

```text
src/app/engine/          Engine A and canonical Engine B rules
src/app/domain/          identity, opportunity, evidence, consent and lifecycle contracts
src/app/sih/             authenticated multi-role product pages and runtime
src/app/components/sih/  student, faculty, recruiter and verification workspaces
src/app/demo/            isolated controlled reference implementation
src/app/services/sih/    browser DAL, recruiter projections and production service boundaries
supabase/migrations/     versioned schema, RLS, trusted functions and lifecycle hardening
supabase/tests/          relational, authorization and privacy assertions
worker/src/sih/          authenticated trusted-operation endpoints
scripts/                 deterministic QA, deployment preflight and validation tools
docs/                    implementation status, audits and operator runbooks
```

## Data, research and standards framing

The checked-in guidance knowledge base is a curated demonstration dataset grounded in NCO-2015 occupational identifiers and NSQF-aligned qualification metadata. Its salary and demand signals are versioned, indicative snapshots—not live labour-market statistics or government certification.

CareerCase uses established ideas such as issuer/holder/verifier separation, scoped attestations and portable credential provenance as design references. It does not claim a complete W3C Verifiable Credentials or Open Badges implementation. Likewise, the product is designed with data minimization, consent, RLS and accessibility targets, but formal DPDP compliance, WCAG 2.2 AA conformance and independent security validation must not be claimed until their respective reviews are complete.

## License and contact

Released under the [MIT License](./LICENSE). Maintained by [Kamal Reddy](https://github.com/KamalReddy2901).

Issues and feature requests are welcome in the [public issue tracker](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/issues).

---

**Disclaimer:** CareerCase provides exploratory guidance and explainable opportunity-readiness support. It is not a diagnostic instrument, a hiring recommendation, a guarantee of placement or a substitute for qualified human counseling, verification or recruitment judgment.
