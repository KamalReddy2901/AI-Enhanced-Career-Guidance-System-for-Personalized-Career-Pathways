# CareerCase: Project Brief and Current Readiness

**AI-assisted, evidence-led career guidance for India**

**Status updated:** 14 August 2026

**Official attached problem statement:** SIH260480
**Problem lineage note:** the accompanying research dossier also discusses the earlier PS-1781 theme. Use SIH260480 for the currently attached problem statement unless the submission authority confirms otherwise.

## Executive summary

CareerCase is a functional web prototype that helps a person build a Career Passport, complete four short assessments, inspect deterministic career matches, compare multiple routes into an occupation, and explore a role through AI-assisted dossiers, simulations, interview preparation, and a grounded counselor.

The product’s strongest design decision is the separation between:

- deterministic guidance: scoring, gaps, recommendation grouping, and pathway construction;
- generative assistance: resume/aspiration extraction, dossiers, simulations, and conversation;
- user evidence: self-reported, assessed, project, work-sample, or credential evidence with confidence metadata.

The app is suitable for demos and structured user testing. It is not yet ready to be described as a validated counseling instrument, a live labor-market system, a government-integrated service, or a production-ready government deployment.

## Problem and product position

The attached problem statement calls for an AI career-guidance platform that can assess interests, abilities, and aspirations; recommend suitable careers; identify gaps; construct pathways; and adapt as the learner progresses.

CareerCase currently covers that loop at prototype depth:

1. account and consent;
2. profile and constraints;
3. interests, aptitude, values, and aspiration assessments;
4. evidence-backed skill profile;
5. explainable career landscape;
6. skill-gap and readiness signals;
7. focused, lower-risk, and credential-first pathways;
8. pathway progress feeding back into the passport;
9. AI-assisted exploration and conversation.

It goes beyond a generic career chatbot by keeping the ranked score deterministic and displaying the component scores and weights. Its present weakness is validation: the knowledge base is internally consistent, but its occupational profiles, assessment validity, transition strengths, and market indicators have not yet been independently validated at population scale.

## Current user journey

### New user

1. Create an account or sign in.
2. Complete required onboarding and data-processing consent.
3. Select a user segment, goals, education, experience, constraints, and optional cloud-history consent.
4. Land on the dashboard.
5. Complete four assessment sections or add evidence in the Career Passport.
6. Review the canonical passport-completeness breakdown shared by the dashboard, passport, and assessment desk.
7. Open the career landscape and inspect “Why this?” evidence.
8. Build and save a pathway, choose a route, and record progress.
9. Explore a dossier, simulation, interview preparation, counselor, roadmap, transition, or comparison.

### Returning user

- “Continue your casefile” and the homepage primary action lead to the dashboard.
- The dashboard identifies the next incomplete canonical section.
- Saved recommendations, pathways, assessment runs, progress events, consent history, and exploration history are restored from local and/or account storage.

## Implemented capabilities

### Career Passport

- Five supported segments: school student, college student, job seeker, career switcher, and professional.
- Education, experience, location, relocation, time, budget, language, income-continuity, aspiration, assessment, and skill evidence.
- Weighted completeness contract totaling 100%:
  - basics 20;
  - skills 20;
  - interests 20;
  - aptitude 15;
  - values 10;
  - aspiration 15.
- Manual and AI-extracted skills, including migration-safe display of custom skills.
- Undo/redo passport history.

### Assessments

- RIASEC interest inventory: 36 items.
- Aptitude screener: one 24-item form selected from a 48-item two-form bank; numerical, verbal, logical, and spatial dimensions.
- Work values: 15 comparisons across stability, growth, autonomy, impact, balance, and compensation.
- Aspirations: five structured prompts with optional AI extraction.
- Input locks prevent rapid repeated answers from skipping items or overrunning an assessment.

These are product screeners, not yet psychometrically validated instruments. Results must be presented as exploratory signals, not diagnoses or guarantees.

### Deterministic recommendation engine

The total is the weighted sum of 11 0–100 components:

1. RIASEC interest similarity;
2. aptitude fit;
3. values fit;
4. current skill coverage;
5. transferable evidence;
6. related experience;
7. aspiration alignment;
8. indicative market signal;
9. progression options;
10. learning feasibility;
11. geographic fit.

Weights vary by segment and sum to 100%. The language model does not assign these scores. Each generated landscape now records an explicit guidance-engine, assessment-bank, scoring, and knowledge-base release identifier. The UI exposes each raw component, its weight, source category, source/freshness note, missing-data neutrality, completed-user-input coverage, and bounded skill counterfactuals.

The landscape returns 13 diverse recommendations across safe, stretch, and ambitious groupings. “Best fit” preserves the engine’s diversified order. “Fastest path” compares the minimum calculated duration across each occupation’s routes instead of using a proxy.

### Gap and pathway engine

- Skill Gap Index uses proficiency, requirement importance, and evidence confidence.
- Readiness is `100 − SGI`; it is a planning signal, not a probability of success.
- Every validated occupation produces three core routes:
  - focused route;
  - lower-risk/stepping-stone route;
  - credential-first route.
- Conditional entrepreneurial and accelerated construction exists in the engine where profile conditions allow it.
- Route labels do not claim “fastest” unless durations have actually been compared.
- A saved route stays stable while readiness refreshes, so completing a step does not move the user’s goalposts.
- Checklist and Gantt views persist progress.

### AI-assisted exploration

Current AI use cases include:

- full dossiers for roles outside the grounded knowledge base;
- resume and aspiration extraction;
- simulations and interview questions;
- related careers and resource suggestions;
- career comparisons, roadmaps, and transition plans;
- grounded counselor responses.

Known occupations use the versioned knowledge base for their preliminary snapshot and deterministic work-life/interview indicators instead of spending an AI request. AI responses are normalized before rendering so missing fields cannot crash dossier pages. The counselor is instructed not to invent score changes: a change may be quantified only when the supplied context contains a computed before/after counterfactual.

AI-generated salaries, companies, resources, work-life descriptions, and narrative market commentary still require independent verification. They are not authoritative labor-market data.

### Data and consent

- Supabase authentication and user-scoped guidance persistence.
- Local fallback/cache for product continuity.
- Required data-processing consent and optional cloud-history consent.
- Minor/guardian flow is explicitly marked as a demonstration workflow.
- Export downloads a schema-versioned JSON package.
- Guidance deletion removes the six guidance-table record groups and local guidance state while keeping the login account.
- Consent writes share an event identity to prevent local-to-cloud duplication.

## Verified knowledge-base inventory

The validation suite currently reports:

| Entity | Count |
|---|---:|
| Occupations | 100 |
| Skills | 178 |
| Qualifications | 105 |
| Occupation transitions | 300 |
| Market signals | 100 |
| Vocational entry roles | 61 |

All 100 occupations pass structural validation and generate three core routes. The knowledge base is versioned in code. “NCO/NSQF-grounded” means records carry curated NCO codes, NSQF levels, requirements, and qualification metadata; it does not mean every record or mapping has been certified by a government body.

## Architecture and deployment

### Frontend

- React 18 and TypeScript;
- React Router 7;
- Vite 6 and Tailwind CSS 4;
- Motion, GSAP, Three.js, and Recharts;
- React Context for app, auth, preference, and guidance state.

### Services

- Supabase Auth and PostgreSQL-backed product tables;
- Cloudflare Worker as the Groq proxy;
- Cloudflare Pages for the frontend;
- Groq model pool currently exercising `openai/gpt-oss-20b` and `openai/gpt-oss-120b`.

### AI key reliability

- Production requests go through the authenticated Cloudflare Worker; Groq credentials are not embedded in the production browser bundle.
- The Worker selects healthy keys round-robin within each warm isolate, deduplicates configured keys, honors `Retry-After` on 429 responses, quarantines 401 keys for 15 minutes, and performs one bounded retry for a network or 5xx failure. Request-level 4xx failures do not incorrectly quarantine a healthy key.
- Usage types route explicitly between `openai/gpt-oss-20b` for lighter tasks and `openai/gpt-oss-120b` for dossiers, simulations, counselor, interview, comparison, transition, roadmap, compatibility, and structured market-intelligence work. Unknown usage types fail safe to the premium tier.
- Intermittent GPT-OSS strict-JSON validation failures receive one prompt-guided JSON retry without `response_format`; callers still parse and validate the result.
- GPT-OSS requests use low-effort, hidden reasoning so internal reasoning cannot consume a concise UI response budget or appear in the rendered answer. An empty completion is treated as a provider failure and activates the grounded fallback instead of rendering a blank response.
- Successful Worker responses expose only non-secret operational metadata: selected model and configured key-pool size.
- Counselor evidence is compacted and bounded, recent history is capped, and output is limited so a complete passport remains below the provider request budget. SSE parsing buffers split network chunks instead of silently dropping partial events.
- The repository includes a non-secret diagnostic command: `cd worker && npm run keys:check`.
- It fingerprints keys rather than printing them, checks authentication/model availability, performs a JSON-mode call, and verifies a complete SSE streaming response.
- On 14 August 2026, all 11 configured keys passed every check: authentication 200, both GPT-OSS models present, parseable 20B JSON, and complete 120B SSE output. The validated set was synchronized to the Worker secret, and a signed-in production response reported a pool size of 11. The Worker rotation/policy suite passed all 12 tests.
- A signed-in production probe reproduced the former Counselor failure as an oversized 413 request; an equivalent bounded 16,160-character Counselor stream then completed with HTTP 200 and a terminal SSE event.

### Quality commands

```bash
npm run typecheck
npm run kb:validate
npm run qa:guidance
npm run qa:product
npm run build
cd worker && npm test
cd worker && npm run keys:check
```

The repository uses TypeScript executable QA suites, Node’s test runner for the worker, knowledge-base validation, and production builds. It does not currently contain a Vitest/React Testing Library browser-component suite, so the brief must not claim that it does.

## Latest end-to-end audit fixes

The August 2026 production audit used a signed-in burner account from onboarding through a complete passport and pathway. Fixes include:

- homepage casefile continuation now opens the dashboard;
- homepage primary copy now says “Open your dashboard” for an existing passport;
- dashboard, passport, and assessment desk use one completeness contract;
- aspiration seeding no longer marks the assessment complete;
- the next untouched assessment is labeled “Next,” not “In progress”;
- rapid double answers cannot skip assessment questions or crash the route;
- raw React Router failures use a branded recovery screen;
- custom/manual skills no longer disappear;
- recommendation dossier links use durable occupation IDs and survive reloads;
- incomplete/malformed AI dossier payloads receive safe typed fallbacks;
- cached or AI-supplied trend data is normalized before rendering, so an incomplete list cannot crash the homepage;
- production recovery pages no longer expose raw runtime diagnostics;
- decorative scrolling career titles are removed from the accessibility tree;
- interview preparation honors its URL career when transient job state is empty;
- path duration labels and fastest sorting use real route durations;
- saved paths no longer change length after a completed step;
- AI counselor counterfactual claims are constrained to computed evidence;
- the grounded Counselor no longer exceeds Groq's request budget for a rich passport, and its stream parser preserves events split across network chunks;
- GPT-OSS strict-JSON validation failures receive a single safe prompt-guided retry, while unrelated 4xx failures remain non-retryable;
- every active AI feature has an explicit model-tier route, including compatibility, roadmap, and market intelligence;
- guidance results now invalidate stale cached scoring contracts and disclose the engine, assessment, scoring, knowledge-base, and component-source provenance;
- weak skill evidence is no longer treated like fully supported evidence in the skill-fit component;
- the recommendation evidence panel restores keyboard focus, has a programmatic dialog title, and exposes source details;
- card and landscape controls are localized in English, Hindi, and Telugu; landscape points support keyboard focus, Enter, and Space;
- export declares a schema version;
- duplicate consent migration writes are prevented.

## Alignment with the attached research dossier

### Strong alignment

- Hybrid deterministic-plus-generative architecture.
- Multi-dimensional profile rather than a single interest quiz.
- Evidence and confidence carried with skills.
- Multi-objective recommendation explanation.
- Gap analysis and multiple pathway choices.
- India-specific NCO/NSQF vocabulary and vocational roles.
- User-segment-specific weights.
- Aspirational conversation and practical constraints.
- Adaptive loop from completed steps back into the profile.
- English, Hindi, and Telugu UI coverage on the core guidance journey.
- User export and deletion controls.

### Partial alignment

- Market signals are timestamped and versioned, but primarily curated/indicative and supplemented by AI; they are not verified real-time vacancy statistics.
- RPL is represented in planning and evidence, but there is no live assessor or credential-verification integration.
- Multilingual coverage exists, but not every Explore/AI surface is fully localized or independently evaluated for translation quality.
- Fairness QA uses six synthetic personas and structural checks; it is not a demographic bias audit using representative outcomes.
- Confidence appears at skill and recommendation levels, but the product needs clearer uncertainty calibration and provenance on all AI content.
- Minor consent is a transparent demo, not production-grade verifiable parental consent.

### Missing before a public production claim

1. Independent psychometric validation of the assessments, including reliability, construct validity, differential item functioning, and age/education norms.
2. Counselor-led evaluation of recommendation usefulness, harmful misses, explanation comprehension, and pathway realism.
3. Source-by-source audit of all 100 NCO codes, NSQF levels, qualifications, and 300 transition strengths.
4. Real labor-market ingestion with provenance, licensing, update cadence, regional resolution, and stale-data handling.
5. End-to-end government integrations. SIDH, NCS, PMKVY, DigiLocker, and verified RPL are currently future integration targets, not live integrations.
6. Formal DPDP legal review, retention schedule, data-principal request workflow, breach process, and production guardian-consent mechanism.
7. Security review covering RLS policies, abuse/rate limiting, worker authentication, dependency scanning, secret rotation, audit logging, and penetration testing.
8. Automated browser tests across onboarding, all assessments, recommendations, path progress, dossier fallbacks, export, and deletion.
9. Accessibility audit against WCAG 2.2 AA, including keyboard-only, screen-reader, focus order, reduced motion, color contrast, and Hindi/Telugu rendering.
10. Observability with privacy-safe error reporting, availability/latency SLOs, AI failure metrics, and rollback/deployment checks.
11. Field pilots with school students, college students, job seekers, career switchers, vocational learners, counselors, parents, and low-connectivity users.
12. A clear human-escalation and safeguarding operating model, not only an in-product message.

## Readiness assessment

| Area | Current standing |
|---|---|
| Product concept | Strong and differentiated |
| Deterministic engine | Implemented and structurally tested |
| Core signed-in journey | Functional after end-to-end hardening |
| AI reliability | Key pool and fallbacks tested; content truth still needs validation |
| Knowledge-base breadth | Good prototype breadth; authority review pending |
| Assessment science | Prototype only |
| Market-data authority | Indicative only |
| Government integration | Designed for future integration; not connected |
| Privacy/security | Meaningful controls implemented; formal assurance pending |
| Accessibility/localization | Partial, requires specialist audit |
| Deployment readiness | Demo/user-pilot ready; not government-production ready |

## Recommended path to readiness

### Gate 1: trustworthy pilot

- Freeze a versioned assessment and KB release.
- Complete expert reviews with counselors and occupational specialists.
- Add automated browser regression tests and privacy-safe error monitoring.
- Run accessibility and localization audits.
- Publish content provenance and AI disclaimers consistently.

### Gate 2: evidence pilot

- Recruit representative users across the five segments.
- Measure assessment completion, explanation comprehension, option diversity, counselor agreement, harmful recommendations, pathway follow-through, and subgroup disparities.
- Recalibrate item banks, component weights, confidence, and transition strengths from evidence rather than intuition.

### Gate 3: production service

- Complete legal/security reviews and incident processes.
- Integrate authoritative market and course sources under explicit agreements.
- Implement verified credentials/RPL and production guardian consent.
- Establish human counselor escalation and content-governance operations.
- Define SLOs, data-retention rules, model-change evaluation, and rollback controls.

## Success metrics to validate, not assume

- completion and drop-off by step and user segment;
- test-retest reliability and construct validity;
- counselor agreement and user-rated explanation clarity;
- recommendation diversity and harmful-miss rate;
- pathway feasibility and milestone completion;
- outcomes by language, gender, location, education, and socioeconomic proxy;
- AI groundedness/error rate and fallback frequency;
- deletion/export completion and data-request response time;
- page performance, error-free sessions, and accessibility defects.

Targets should be set after a baseline pilot. The previous brief’s user-growth, placement, accuracy, and government-volume numbers were aspirations without measured evidence and have therefore been removed.

## Bottom line

CareerCase now has a coherent, professional prototype journey and a credible technical core: deterministic scoring, explicit evidence, diverse options, transparent gaps, and multiple routes. The next milestone is not adding more surface area. It is proving that the assessments, occupational mappings, explanations, and pathways are valid, fair, understandable, safe, and useful for real Indian users.

**Current claim:** demo-ready and suitable for controlled user pilots.

**Claim not yet supported:** psychometrically validated, officially government-integrated, or government-production ready.
