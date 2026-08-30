# CareerCase

**Evidence-backed Opportunity Readiness & Skills Intelligence for the academia–industry ecosystem.**

[![Current legacy deployment](https://img.shields.io/badge/current-careercase.pages.dev-666)](https://careercase.pages.dev/)
[![CI](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/actions/workflows/ci.yml/badge.svg)](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)](https://www.typescriptlang.org/)

> A career decision should show its work. CareerCase turns a person's interests, aptitudes, values, skills, experience, aspirations, and constraints into ranked career matches, visible evidence, and practical next steps.

> `careercase.pages.dev` is the current legacy deployment. It must not be described as the integrated SIH26044 deployment until the convergence branch passes preview, authenticated smoke testing, production deployment, and post-deploy regression.

![CareerCase home page](./others/presentation-assets/homepage.jpg)

CareerCase is being developed for **SIH26044 — Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement**. It evolves the existing guidance product into an evidence-backed opportunity-readiness and skills-intelligence layer without collapsing private career guidance into recruiter scoring.

The locked loop is:

`Career Passport → Career Direction → Opportunity → Opportunity Readiness → Explainable Gap → Prove / Practice / Learn / Experience → Verification → Consented Application → Human Recruitment / Collaboration → Outcome → Updated Evidence → Institution / Industry Skills Intelligence → Intervention`

Implementation truth and remaining limitations are tracked in [`docs/sih26044-integration-status.md`](./docs/sih26044-integration-status.md).

## Engine A — Career Guidance

`Profile → Understand → Match → Plan → Progress`

- A living **Career Passport** with evidence and confidence attached to skill claims.
- Four **exploratory assessments** covering RIASEC interests, aptitude signals, work values, and aspirations.
- A transparent **11-component recommendation engine** with a “Why this?” breakdown for every match.
- A visual **Career Landscape** that compares fit, transition ease, and reward potential.
- Exactly **three pathways per occupation**: focused, lower-risk, and credential-first.
- Skill-gap analysis, qualification/provider discovery, saved plans, and progress tracking.
- Optional AI-assisted dossiers, simulations, interview practice, and grounded counseling.

## Product boundaries

| Area | Current prototype | Important boundary |
|---|---|---|
| Career matching | Deterministic, 11-component weighted scoring | A match score is a fit index, not a probability of placement or success |
| Assessments | Structured exploratory screeners | Psychometric and multilingual validation are still pending |
| Market signals | Versioned `2025-H2` indicative snapshot | Not real-time vacancy or authoritative labour-statistics data |
| AI | On-demand extraction, dossiers, simulations, and counseling | AI does not set or alter the deterministic match score |
| Privacy controls | Explicit consent, JSON export, deletion, RLS-backed cloud persistence | Formal DPDP legal/compliance review is pending |
| Government integrations | NCO/NSQF-aligned data model and proposed interface contracts | SIDH, NCS, DigiLocker, and PMKVY connectors are not implemented |

## Knowledge base

The checked-in knowledge base is versioned as `kb-2026.06.1` and validated in CI.

| Entity | Count |
|---|---:|
| Occupations | 100 |
| Skills | 178 |
| Qualifications | 105 |
| Occupation transitions | 300 |
| Market signals | 100 |
| Vocational entry roles | 61 |

The data is a curated demonstration dataset grounded in NCO-2015 codes and NSQF levels. Demand and salary signals are indicative, not live statistics.

## Architecture

- **Client:** React 18, TypeScript, React Router 7, Vite 6, Tailwind CSS 4.
- **Engine A — Career Guidance:** versioned TypeScript knowledge modules and deterministic career-direction functions. RIASEC, values, private aspirations and counselor context remain private to this runtime.
- **Engine B — Opportunity Readiness:** separate authenticated production runtime with deterministic, versioned, requirement-level readiness and `UNKNOWN ≠ UNSKILLED` semantics.
- **Controlled Reference Implementation:** `/demo/*` remains isolated from production Supabase data and providers.
- **Persistence:** browser-local fallback plus optional Supabase Auth/PostgreSQL with row-level security.
- **AI gateway:** optional Cloudflare Worker proxy to Groq, with authenticated requests, model-tier routing, key rotation, quarantine, and retry policies.
- **AI models:** `openai/gpt-oss-20b` for lighter tasks and `openai/gpt-oss-120b` for more complex tasks.
- **Hosting:** Cloudflare Pages for the client and Cloudflare Workers for the optional AI gateway.

## Run locally

### Prerequisites

- Node.js `22.16.0` (see [`.node-version`](./.node-version)).
- npm.
- Optional: Supabase project for sign-in and cross-device persistence.
- Optional: Cloudflare and Groq accounts for AI-assisted features.

### Install and start

```bash
git clone https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways.git
cd AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways
npm ci

cp .env.example .env.local
npm run dev
```

The deterministic guidance flow works without AI credentials. Without Supabase configuration, profile data uses the browser-local fallback.

### Client environment

```env
# Optional: account authentication and cloud persistence
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Worker origin only; the client appends /ai
VITE_AI_PROXY_URL=https://your-worker.workers.dev

# Trusted SIH service origin; the client appends /sih/*
VITE_WORKER_URL=https://your-worker.workers.dev

# Development-only direct Groq fallback; never use in a production build
# VITE_GROQ_API_KEYS=gsk_...
```

Keep secrets out of `VITE_*` variables: Vite exposes them to the browser. The Supabase anonymous key is designed to be public when appropriate RLS policies are enabled; Groq keys belong in Worker secrets.

For full account-backed persistence, run both migrations in the Supabase SQL editor: first [`supabase-migration.sql`](./supabase-migration.sql) for exploration history and favorites, then [`supabase-guidance-migration.sql`](./supabase-guidance-migration.sql) for the Career Passport, assessments, plans, and consent records.

### Optional AI Worker

The repository includes a safe Worker configuration plus [`worker/wrangler.toml.example`](./worker/wrangler.toml.example).

```bash
cd worker
npm ci

# Set encrypted Worker secrets interactively
npx wrangler secret put GROQ_API_KEYS
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY

npm test
npm run deploy
```

`GROQ_API_KEYS` accepts a comma-separated key pool. After deployment, set `VITE_AI_PROXY_URL` to the Worker origin and rebuild the client.

## Quality checks

```bash
npm run typecheck
npm run kb:validate
npm run qa:guidance
npm run qa:guidance-regression
npm run qa:product
npm run qa:trending
npm run build

cd worker
npm test
npx tsc --noEmit
```

GitHub Actions runs these checks for pushes and pull requests. The current automated suite covers knowledge-base integrity, completeness contracts, deterministic regression behavior, product invariants, trend normalization, and Worker key/retry policy behavior. Full browser automation, formal accessibility testing, security review, and field validation remain future work.

## Demo journey

For a concise product walkthrough:

1. Open the Career Passport and show the evidence-backed profile.
2. Open Career Landscape and compare the ranked recommendations.
3. Select **Why this?** to show the 11 scoring components and sources.
4. Open one career and compare its three pathway routes.
5. Show the skill gap, qualification/provider options, and a progress step.
6. Use a pre-generated dossier or counselor response only if time allows.

## Repository map

```text
src/app/engine/          deterministic scoring, passport, gap, and pathway logic
src/app/data/knowledge/  versioned occupations, skills, qualifications, and market signals
src/app/pages/           product surfaces and assessment flows
src/app/services/        Supabase persistence and optional AI integrations
scripts/                 deterministic product and regression QA
worker/                  authenticated Cloudflare AI gateway and tests
others/                  archived research, presentation, and implementation artifacts
```

## Readiness and claims

Engine A and `/demo/*` are controlled prototypes. The SIH26044 database foundation, exact immutable application-snapshot binding, production route boundary, trusted Worker endpoints and core RLS controls are implemented. Authenticated multi-role fixtures, browser-level accessibility testing and an integrated production deployment are still pending and must not be claimed as complete.

NCS, Skill India Digital Hub, AICTE, NATS/NAPS, DigiLocker/NAD and APAAR/ABC are target or integration-ready boundaries only; no live integration or government endorsement is claimed.

## License and contact

Released under the [MIT License](./LICENSE). Maintained by [Kamal Reddy](https://github.com/KamalReddy2901).

Issues and feature requests are welcome in the [public issue tracker](https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways/issues).

---

**Disclaimer:** CareerCase is an exploratory prototype, not a diagnostic instrument or a substitute for a qualified career counselor. Validate recommendations, course/provider details, salary estimates, and market signals before making a major education or career decision.
