# CareerCase → "AI-Enhanced Career Guidance System for Personalized Career Pathways"
## SIH Implementation Plan (Executor Instructions) — v1.0

> **Problem Statement:** SIH PS "AI-Enhanced Career Guidance System for Personalized Career Pathways" — Ministry of Skill Development & Entrepreneurship (MSDE) / NCVET, Theme: Smart Education.
> **Base app:** CareerCase (this repository). Nothing is built from scratch — every phase upgrades or extends the existing codebase.
> **Deployment target stays the same:** Cloudflare Pages (frontend) + Cloudflare Worker (Groq proxy with key rotation) + Supabase (auth + data).

---

## 0. HOW TO USE THIS DOCUMENT (read first, executor)

1. Read **Section 1 (Context Primer)** and **Section 2 (Ground Rules)** completely before touching any file.
2. Execute phases **strictly in order** (Phase 1 → Phase 11). Each phase lists: goal → exact file-level instructions → acceptance criteria.
3. **Do not proceed to the next phase until every acceptance criterion of the current phase passes.** Run `npm run build` (or `pnpm build`) at the end of every phase — a failing build blocks progression.
4. Commit once per phase with the message format: `Phase N: <phase title>`.
5. When a step says "create file X with schema Y", the schema/interfaces given here are **normative** — match field names exactly, because later phases import them.
6. Appendices A (formulas & weights), B (LLM prompt templates & agent policy) and C (pitch notes) are referenced throughout — treat them as part of the spec.
7. If something in the existing code conflicts with this plan, this plan wins — but **never** violate Section 2 (Ground Rules).

---

## 1. CONTEXT PRIMER — what exists today and what we are building

### 1.1 Current app (CareerCase) — as-is inventory

- **Stack:** React 18 + TypeScript + Vite + Tailwind v4 (CSS-first `@theme` config), shadcn/radix UI in `src/app/components/ui/`, `motion` (framer-motion successor) for animation, recharts, PWA via `vite-plugin-pwa`.
- **Design DNA (must be preserved — see §2.1):** off-white newsprint paper background (`#f9f8f7`) with multi-layer SVG grain/crumple textures (in `src/styles/theme.css`), black-ink foreground, `Playfair Display` for display/headline text, `Inter` for body, `JetBrains Mono` for data/labels, hand-drawn SVG **stick figures** (`src/app/components/StickFigure.tsx`, 22 poses), synthesized **WebAudio sounds** (`src/app/utils/sounds.ts`), haptic feedback (`src/app/utils/haptic.ts`), accent colors used sparingly ("pop" moments only).
- **Auth/data:** Supabase (`src/app/services/supabase.ts`, `src/app/context/AuthContext.tsx`) — email/password + Google OAuth. Existing tables: `career_history`, `career_favorites`, `user_profiles` (legacy credits columns — billing already removed), `user_usage`, `trending_cache`.
- **AI layer:** all calls in `src/app/services/ai.ts` (~30 exported functions) → POSTs to Cloudflare Worker (`worker/src/index.ts`) at `VITE_AI_PROXY_URL` path `/ai`. Worker rotates comma-separated Groq keys on 429, supports SSE streaming (`X-Stream: 1`), and picks a model tier from the `X-Usage-Type` header via `worker/src/models.ts` (`premium: llama-3.3-70b-versatile`, `standard: llama-3.1-8b-instant`).
- **Pages (all in `src/app/pages/`, routed in `src/app/routes.ts`):** Home, Auth, JobOverview, JobDetail (AI "dossier"), Simulation ("day-in-the-life"), History, Quiz, Comparison, Favorites, InterviewPrep, Settings, MoodMatch, CareerTransition, CareerRoadmap, Pricing (neutral info page), NotFound.
- **Hooks:** `useFavorites`, `useStreak`, `usePreferences`, `useKeyboardShortcuts`. LocalStorage AI-response cache (24h) inside `ai.ts`.

### 1.2 What we are building (the delta)

The current app is an excellent **career exploration** tool. The PS demands a career **guidance system**: assessment → matching → skill-gap → pathway → dynamic replanning. We add four deterministic engines plus grounding data, and wire every existing feature into them:

| PS Key Area | New capability | Where it lives |
|---|---|---|
| Aptitude Assessment | RIASEC interest inventory + timed aptitude mini-tests + work-values sorter (all deterministically scored) | `src/app/engine/` + `/assess` pages |
| Aspirations & Interests | Conversational LLM aspiration-elicitation producing a structured aspiration object | `/assess/aspirations` |
| Ability & Experience Mapping | Evidence-based skill profile ("Career Passport") with proficiency + confidence + evidence per skill; resume text extraction | `/passport`, `src/app/engine/skillProfile.ts` |
| Future Progression & Skill Gaps | NCO/NSQF-grounded knowledge base, multi-objective matching engine, Skill Gap Index, transition graph, multi-route pathway plans with an interactive pathway graph | `src/app/data/knowledge/`, `src/app/engine/`, `/recommendations`, `/pathway` |
| User-Friendly Interface | Segment-aware UX (5 user segments with different ranking weights), multilingual (EN/HI/TE), voice I/O, DPDP-compliant consent, native explainability panels | everywhere |

**Core architectural principle (non-negotiable):** the intelligence lives in **deterministic TypeScript engines over a curated India-grounded knowledge base**. The LLM (Groq) is used ONLY for: conversation, natural-language extraction (resume/aspirations), narration/explanation polish, and translation. The LLM **never** invents match scores, salary figures, demand statistics, occupation requirements, or pathway edges. Every displayed number must trace to a deterministic computation over the knowledge base. (This is the #1 differentiator vs. every prior SIH submission — see Appendix C.)

### 1.3 Positioning (why these choices — for context, not code)

- Judged by MSDE/NCVET. Their own platform (Skill India Digital Hub) claims "AI-based personalised recommendations" — our pitch is "the transparent, explainable, NCO-2015/NSQF-grounded recommendation methodology such a hub needs underneath that claim."
- The most direct predecessor repo against this exact PS shipped a hardcoded 3-career frontend with an untrained model. We ship a real end-to-end pipeline over ~100 real NCO-coded occupations.
- Nearly all competitors: no India taxonomy grounding, no proficiency-weighted gaps, no multi-route pathways, no visible DPDP compliance, one undifferentiated UI for students and professionals. We do all of these.

---

## 2. NON-NEGOTIABLE GROUND RULES

### 2.1 Design DNA — preserve and extend, never replace

The owner loves the current aesthetic. Every new screen MUST look like it was drawn by the same hand:

1. **Palette:** paper white/off-white backgrounds (`var(--background)` `#f9f8f7`), black ink text, `border-black/10`-style hairline borders. Color appears ONLY as deliberate "pops": small accent chips, chart fills, state highlights. Never introduce gradient-heavy, glassy, or dark-SaaS styling. Never use purple-gradient "AI slop" styling.
2. **Typography:** `font-[Playfair_Display]` for headlines/display numbers, Inter for body, JetBrains Mono for codes/labels/scores (e.g., NCO codes, NSQF levels, percentages). Follow the existing pattern of inline `style={{ fontSize: 'clamp(...)' }}` for responsive display text.
3. **Stick figures:** every major new page gets a contextual `<StickFigure>` (existing 22 poses). Phase 10 adds new poses (`climbing`, `mapping`, `graduating`, `pointing`) drawn in the identical hand-drawn SVG stroke style (stroke `#1a1a1a`, strokeWidth 3.5, round linecaps, subtle `motion` idle animations) — copy the construction pattern of existing poses.
4. **Sound + haptics:** every new interactive element calls `sounds.click()` / `sounds.success()` / `sounds.tabChange()` etc. and `haptic` helpers, exactly like existing pages do. Add new synthesized sounds in Phase 10 (`assessComplete`, `pathUnlock`) following the `playTone`/`playFreqSweep` style — no audio files.
5. **Motion:** entrance animations with `motion/react` (`initial/animate/whileInView`), staggered reveals, `whileHover`/`whileTap` micro-interactions — mirror the existing HomePage patterns. Respect `prefers-reduced-motion` (already handled globally).
6. **Newspaper metaphors welcomed:** section rules (thin double borders), "dateline"-style metadata rows (JetBrains Mono, uppercase, tracking-wide), rotated paper-scrap cards (`rotate-[-1deg]` style) — these already exist on HomePage; reuse them.
7. Mobile-first. Test every new page mentally at 390px width. Reuse `BottomNav` integration and 44px touch targets.

### 2.2 Engineering rules

1. **TypeScript strict** — no `any` unless unavoidable; all engine code pure and side-effect-free (input → output) so it is unit-testable.
2. **No new heavyweight dependencies.** Allowed additions: none required. The pathway graph is hand-rolled SVG (fits the hand-drawn aesthetic better than any graph lib). i18n is a hand-rolled dictionary (no i18next). Voice uses the browser Web Speech API. If you genuinely need a tiny utility, prefer writing it.
3. **Never reintroduce payments/credits/paywalls.** The legacy `user_profiles` credit columns are dead — ignore them.
4. **Do not break existing features.** Dossier, Simulation, Quiz, MoodMatch, Comparison, Transition, Roadmap, InterviewPrep, Favorites, History must all still work after every phase.
5. **All AI calls go through `src/app/services/ai.ts` → the worker.** Never call Groq directly from components. Every new AI call gets a named `X-Usage-Type` (Phase 1 adds them to `worker/src/models.ts`).
6. **LLM JSON discipline:** when requesting JSON from Groq, use `response_format: { type: 'json_object' }` in the request body AND defensive parsing (strip code fences, try/catch, typed validation with fallback). Follow the existing defensive-parse patterns in `ai.ts`.
7. **Graceful degradation:** signed-out users can do everything except cloud persistence (profile lives in localStorage, synced to Supabase on sign-in). AI-down states show the existing friendly error style, never crash.
8. **Language calibration in ALL user-facing recommendation copy:** use "strong option to explore", "plausible route", "based on your current profile", "confidence: medium". NEVER "perfect career", "you are meant to be", "AI predicts you will succeed". This is a judged requirement.
9. Keep components small; extract shared pieces into `src/app/components/guidance/`.
10. **localStorage keys**: prefix all new keys with `cc_guidance_`.

---

## 3. TARGET ARCHITECTURE & NEW FILE MAP

```text
src/app/
├── data/knowledge/            # PHASE 2 — India-grounded career knowledge base (static, versioned)
│   ├── schema.ts              # all KB TypeScript interfaces (normative)
│   ├── skills.ts              # ~160 canonical skills
│   ├── occupations.ts         # ~100 NCO-2015-coded occupations
│   ├── transitions.ts         # directed transition edges between occupations
│   ├── qualifications.ts      # NSQF-aligned qualifications & learning routes
│   ├── market.ts              # timestamped, geo-tagged indicative demand signals
│   ├── index.ts               # loaders, lookup maps, KB_VERSION export
│   └── validate.ts            # referential-integrity validator (run via npm script)
├── engine/                    # PHASES 4–7 — deterministic intelligence (NO LLM imports here)
│   ├── types.ts               # profile/assessment/recommendation interfaces (normative)
│   ├── riasec.ts              # RIASEC scoring
│   ├── aptitude.ts            # aptitude mini-test scoring
│   ├── values.ts              # work-values scoring
│   ├── skillProfile.ts        # evidence-based skill profile builder + merger
│   ├── weights.ts             # segment ranking-weight profiles
│   ├── matching.ts            # candidate generation → multi-objective scoring → diversity grouping
│   ├── gaps.ts                # proficiency-weighted skill gaps + Skill Gap Index
│   ├── pathways.ts            # transition-graph route planning (3+ routes per target)
│   └── explain.ts             # deterministic explanation object builder
├── context/GuidanceContext.tsx  # PHASE 3 — passport state, persistence, recompute loop
├── services/
│   ├── guidanceDb.ts          # PHASE 3 — Supabase CRUD for guidance tables
│   └── ai.ts                  # EXTENDED — new LLM functions (extraction, narration, counselor, translate)
├── i18n/                      # PHASE 8 — en.ts, hi.ts, te.ts, index.ts (useT hook)
├── components/guidance/       # shared guidance UI (ScoreBar, ConfidenceBadge, WhyPanel, PathwayGraph, …)
└── pages/
    ├── OnboardingPage.tsx     # /onboarding  (segment, goals, constraints, consent)
    ├── AssessmentHubPage.tsx  # /assess      (hub with 4 modules + completion states)
    ├── AssessRiasecPage.tsx   # /assess/interests
    ├── AssessAptitudePage.tsx # /assess/aptitude
    ├── AssessValuesPage.tsx   # /assess/values
    ├── AssessAspirationsPage.tsx # /assess/aspirations (conversational)
    ├── PassportPage.tsx       # /passport    (career passport: skills, evidence, assessments)
    ├── RecommendationsPage.tsx# /recommendations (grouped, explained career landscape)
    └── PathwayPage.tsx        # /pathway/:occupationId (routes, gaps, learning, graph)
worker/src/models.ts           # EXTENDED — new usage types
supabase-guidance-migration.sql# PHASE 1 — new tables + RLS
```

**Data flow:** Onboarding + Assessments + Resume + legacy features (Quiz/MoodMatch/Favorites) → **Career Passport** (GuidanceContext) → `matching.ts` over the knowledge base → grouped recommendations with explanation objects → user picks target → `gaps.ts` + `pathways.ts` → pathway plan → progress events → passport update → **automatic recompute** (the "dynamic" loop).

---

## PHASE 1 — Foundations (routes, types, worker, database)

**Goal:** all scaffolding in place so later phases only fill in behavior.

### 1.1 Worker usage types
Edit `worker/src/models.ts` — add to `USAGE_MODEL_TIER`:
```ts
  aspiration: 'premium',    // conversational aspiration elicitation
  resume_extract: 'premium',// resume → structured skills/experience
  narrate: 'standard',      // recommendation narration polish
  counselor: 'premium',     // grounded counselor chat
  translate: 'standard',    // i18n content translation
  gap_advice: 'standard',   // skill-gap learning tips
```
No other worker changes (rotation/streaming/CORS already work). If you deploy the worker, it's `cd worker && npx wrangler deploy` — but code must work regardless of deployment timing.

### 1.2 Supabase migration
Create `supabase-guidance-migration.sql` at repo root (the owner runs it in the Supabase SQL editor; also referenced from README). Contents — six tables, all with RLS "own rows only" (copy the exact policy style used in `supabase-migration.sql`):

```sql
-- 1. guidance_profiles: one row per user — the Career Passport (jsonb snapshot)
create table if not exists public.guidance_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  segment text,                        -- 'school_student'|'college_student'|'job_seeker'|'career_switcher'|'professional'
  passport jsonb not null default '{}'::jsonb,   -- full CareerPassport object (see engine/types.ts)
  passport_version int not null default 1,
  updated_at timestamptz default now()
);
-- 2. guidance_assessments: one row per completed assessment run
create table if not exists public.guidance_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null,                  -- 'riasec'|'aptitude'|'values'|'aspiration'
  result jsonb not null,
  taken_at timestamptz default now()
);
-- 3. guidance_recommendations: versioned, source-traceable recommendation snapshots
create table if not exists public.guidance_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  passport_version int not null,
  kb_version text not null,
  result jsonb not null,               -- full RecommendationSet incl. per-career component scores
  created_at timestamptz default now()
);
-- 4. guidance_pathways: saved pathway plans
create table if not exists public.guidance_pathways (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  occupation_id text not null,
  plan jsonb not null,
  status text not null default 'active',  -- 'active'|'completed'|'archived'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- 5. guidance_progress: progress events that drive replanning
create table if not exists public.guidance_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,            -- 'skill_validated'|'module_completed'|'milestone_done'|'profile_edit'
  payload jsonb not null,
  created_at timestamptz default now()
);
-- 6. guidance_consents: DPDP consent ledger (append-only)
create table if not exists public.guidance_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  consent_type text not null,          -- 'terms'|'data_processing'|'guardian'
  granted boolean not null,
  detail jsonb not null default '{}'::jsonb,  -- e.g. {"guardian_email_hash":"…","method":"email_ack"}
  created_at timestamptz default now()
);
```
Add RLS enable + select/insert/update/delete policies per table matching the existing file's style (guidance_consents: select+insert only — append-only ledger).

### 1.3 Engine types
Create `src/app/engine/types.ts` — the normative interfaces used everywhere. Include (exact names):

```ts
export type Segment = 'school_student' | 'college_student' | 'job_seeker' | 'career_switcher' | 'professional';
export type Proficiency = 0 | 1 | 2 | 3 | 4;   // 0 none, 1 beginner, 2 intermediate, 3 advanced, 4 expert
export type EvidenceType = 'self_reported' | 'inferred_from_resume' | 'assessed' | 'credentialed' | 'inferred_from_activity';

export interface SkillEvidence { type: EvidenceType; description: string; confidence: number; /* 0–1 */ observedAt: string; /* ISO date */ }
export interface SkillClaim { skillId: string; proficiency: Proficiency; confidence: number; evidence: SkillEvidence[]; }
export interface RiasecScores { R: number; I: number; A: number; S: number; E: number; C: number; }  // each 0–100
export interface AptitudeScores { numerical: number; verbal: number; logical: number; spatial: number; }  // each 0–100
export interface WorkValues { stability: number; growth: number; autonomy: number; impact: number; balance: number; compensation: number; }  // each 0–100, sums normalized
export interface Aspiration { statement: string; horizonYears: number; themes: string[]; dreamOccupationIds: string[]; entrepreneurialIntent: 'none'|'curious'|'strong'; capturedVia: 'conversation'|'form'; }
export interface Constraints { location: string; canRelocate: boolean; weeklyLearningHours: number; budgetLevel: 'low'|'medium'|'high'; languages: string[]; needsIncomeContinuity: boolean; }
export interface Experience { title: string; occupationId?: string; years: number; description: string; }
export interface Education { level: 'below_10'|'class_10'|'class_12'|'iti_diploma'|'undergraduate'|'postgraduate'; field?: string; nsqfLevel?: number; }

export interface CareerPassport {
  segment: Segment;
  education: Education;
  experiences: Experience[];
  skills: SkillClaim[];
  riasec?: RiasecScores;
  aptitude?: AptitudeScores;
  values?: WorkValues;
  aspiration?: Aspiration;
  constraints: Constraints;
  completeness: number;      // 0–100, computed
  version: number;
  updatedAt: string;
}

export type FitDimension = 'interest'|'aptitude'|'values'|'skill'|'transferable'|'experience'|'aspiration'|'market'|'progression'|'learningFeasibility'|'geographic';
export interface ComponentScore { dimension: FitDimension; score: number; /* 0–100 */ weight: number; note: string; dataAvailable: boolean; }
export type RecommendationGroup = 'best_fit'|'growth'|'easiest_transition'|'aspiration'|'exploration'|'vocational_entrepreneurial';
export interface CareerRecommendation {
  occupationId: string;
  totalScore: number;               // 0–100 weighted composite
  confidence: 'low'|'medium'|'high';// driven by passport completeness + evidence confidence
  group: RecommendationGroup;
  components: ComponentScore[];
  topReasons: string[];             // deterministic, from explain.ts
  whyNotHigher: string[];           // counterfactual levers
  skillGapPreview: { skillId: string; severity: number }[];  // top 3
}
export interface RecommendationSet {
  generatedAt: string; passportVersion: number; kbVersion: string;
  segment: Segment; weightsUsed: Record<FitDimension, number>;
  recommendations: CareerRecommendation[];
}

export interface SkillGap { skillId: string; required: Proficiency; current: Proficiency; importance: number; confidence: number; severity: number; }
export interface GapReport { occupationId: string; gaps: SkillGap[]; transferable: { skillId: string; fromExperience: string }[]; sgi: number; /* 0–100, lower = smaller gap */ readiness: number; }
export type RouteKind = 'direct'|'stepping_stone'|'qualification_first';
export interface PathwayStep { kind: 'validate_skill'|'learn'|'qualification'|'project'|'transition_role'|'target'; label: string; refId?: string; nsqfLevel?: number; estMonths: number; done: boolean; }
export interface PathwayRoute { kind: RouteKind; label: string; tradeoff: string; totalMonths: number; steps: PathwayStep[]; confidence: 'low'|'medium'|'high'; }
export interface PathwayPlan { occupationId: string; routes: PathwayRoute[]; chosenRoute?: RouteKind; gapReport: GapReport; createdAt: string; }
```

### 1.4 Routes
Edit `src/app/routes.ts` — add lazy routes (same pattern as existing): `/onboarding`, `/assess`, `/assess/interests`, `/assess/aptitude`, `/assess/values`, `/assess/aspirations`, `/passport`, `/recommendations`, `/pathway/:occupationId`. Create placeholder page components (a Playfair headline + a `StickFigure pose="thinking"` + "coming in a later phase" note) so the build passes.

### 1.5 GuidanceContext shell
Create `src/app/context/GuidanceContext.tsx`: holds `passport: CareerPassport | null`, `recommendations: RecommendationSet | null`, `pathways: PathwayPlan[]`; exposes `updatePassport(mutator)`, `recompute()` (stub until Phase 5), and persistence: localStorage (`cc_guidance_passport`) always + Supabase sync via `src/app/services/guidanceDb.ts` (create with typed CRUD for all six tables, following `supabase.ts` null-guard style) when signed in. On sign-in, merge local → remote (remote wins on conflict by `updatedAt`). Register the provider in the same place `AuthProvider`/`AppProvider` are mounted (check `src/main.tsx` / `RootLayout.tsx`).

**Acceptance criteria (Phase 1):**
- [ ] `npm run build` passes; all 9 new routes render placeholders with the house style.
- [ ] `supabase-guidance-migration.sql` exists, is idempotent (`if not exists`), has RLS on all six tables.
- [ ] `guidanceDb.ts` compiles with typed functions: `loadPassport`, `savePassport`, `saveAssessment`, `saveRecommendationSet`, `savePathway`, `updatePathway`, `logProgress`, `logConsent`, `fetchPathways`, `fetchProgress`.
- [ ] Existing pages all still work.

---

## PHASE 2 — Career Knowledge Base (the grounding layer)

**Goal:** a curated, validated, India-grounded static dataset. This is the project's core defensible asset. Quality bar: every occupation must have a real NCO-2015 code and plausible NSQF alignment.

### 2.1 `src/app/data/knowledge/schema.ts`
```ts
export interface Skill { id: string; name: string; category: 'technical'|'cognitive'|'interpersonal'|'domain'|'tool'|'language'; aliases: string[]; descriptionKey: string; }
export interface OccupationSkillReq { skillId: string; requiredProficiency: 1|2|3|4; importance: number; /* 0–1 */ }
export interface Occupation {
  id: string;                       // slug, e.g. 'data-analyst'
  title: string;
  ncoCode: string;                  // real NCO-2015 code, e.g. '2521.0100' family accuracy required at 4-digit group level minimum
  nsqfEntryLevel: number;           // typical entry NSQF level 1–10
  sector: string;                   // e.g. 'IT-ITeS', 'Healthcare', 'BFSI', 'Agriculture', 'Manufacturing', 'Media', 'Education', 'Logistics', 'Retail', 'Green Jobs', 'Creative', 'Public Service'
  cluster: string;                  // broader family for diversity grouping, e.g. 'analytical', 'creative', 'people', 'hands_on', 'enterprising', 'structured'
  riasecProfile: { R: number; I: number; A: number; S: number; E: number; C: number };  // 0–100 pattern of the occupation
  aptitudeProfile: { numerical: number; verbal: number; logical: number; spatial: number };  // 0–100 importance
  valuesProfile: { stability: number; growth: number; autonomy: number; impact: number; balance: number; compensation: number };  // what the occupation typically offers, 0–100
  skills: OccupationSkillReq[];     // 6–12 per occupation
  educationMin: 'class_10'|'class_12'|'iti_diploma'|'undergraduate'|'postgraduate';
  descriptionKey: string;           // i18n key
  isEmerging: boolean; isVocational: boolean; entrepreneurialFit: number; /* 0–100 */
}
export interface TransitionEdge { fromId: string; toId: string; strength: number; /* 0–1 plausibility */ typicalYears: number; transferNote: string; }
export interface Qualification { id: string; name: string; nsqfLevel: number; type: 'nsqf_course'|'iti'|'diploma'|'degree'|'certification'|'apprenticeship'; developsSkillIds: string[]; preparesForOccupationIds: string[]; typicalMonths: number; providerHint: string; /* e.g. 'Skill India Digital Hub / PMKVY centre', 'NPTEL/SWAYAM', 'State ITI' */ }
export interface MarketSignal { occupationId: string; demandIndex: number; /* 0–100 indicative */ growthTrend: 'rising'|'stable'|'declining'; regions: string[]; observedPeriod: string; /* e.g. '2025-H2' */ source: string; /* e.g. 'Curated from NCS postings + NSDC sector reports (indicative)' */ }
export const KB_LICENSE_NOTE = 'Curated demonstration dataset grounded in NCO-2015 codes and NSQF levels. Demand figures are indicative snapshots, not live statistics.';
```

### 2.2 Curation instructions (do this carefully — it is judged)
- **skills.ts:** ~160 skills across all categories. Cover both white-collar (SQL, financial modelling, UX research…) AND vocational/blue-collar (electrical wiring, CNC operation, phlebotomy, solar panel installation, tailoring, welding, food safety…). Give honest aliases (used by resume extraction matching).
- **occupations.ts:** **exactly 100 occupations** spread across ≥12 sectors including vocational trades (electrician, solar PV technician, lab technician, GDA/healthcare aide), agriculture-tech, green jobs, creative, public service, and modern digital roles. For each, the NCO-2015 code must be **real at the 4-digit unit-group level** (e.g., Software Developer 2512, Nursing Professionals 2221, Electrician 7411, Graphic Designer 2166, Data Entry 4132…). Use your knowledge of NCO-2015 divisions (1 Managers, 2 Professionals, 3 Technicians/Associate, 4 Clerical, 5 Service/Sales, 6 Agriculture, 7 Craft/Trades, 8 Plant/Machine Operators). Where you extend to 8-digit style codes, keep the first 4 digits accurate and it's acceptable to use `.XXXX` sub-codes labeled indicative. RIASEC/aptitude/values profiles must be thoughtful and differentiated (an electrician: high R, high spatial; a counselor: high S, high verbal), NOT copy-paste.
- **transitions.ts:** ≥220 directed edges. Every occupation needs ≥1 outgoing edge (progression) and most need lateral edges. Include classic Indian pathway patterns: ITI electrician → supervisor → contractor(entrepreneur); data entry → MIS analyst → data analyst; nurse → nurse educator; sales exec → key account manager; mechanic → EV technician. `transferNote` must name concretely WHAT transfers ("scheduling, inventory & vendor negotiation transfer directly").
- **qualifications.ts:** ~70 entries mapping to real Indian qualification archetypes: NSQF-aligned short courses (PMKVY-style), ITI trades, diplomas, degrees, NPTEL/SWAYAM certifications, apprenticeships (NAPS). Every occupation must be reachable by ≥1 qualification; every skill taught by ≥1.
- **market.ts:** one signal per occupation. `demandIndex` differentiated and defensible (EV technician rising; data entry declining). ALWAYS carry `observedPeriod` + `source`. The UI will always render these with the freshness metadata — never as timeless facts.
- **index.ts:** export `KB_VERSION = 'kb-2026.06.1'`, plus `skillById`, `occupationById`, `transitionsFrom(id)`, `transitionsTo(id)`, `qualificationsForOccupation(id)`, `qualificationsForSkill(id)`, `marketFor(id)` lookup maps built once at module load.
- **validate.ts:** a pure function `validateKB(): string[]` returning violations: dangling skillIds/occupationIds anywhere, occupations with <6 skills, occupations without outgoing transitions, occupations unreachable by qualifications, duplicate ids, NCO codes not matching `^\d{4}(\.\d{2,4})?$`. Add npm script `"kb:validate": "tsx src/app/data/knowledge/validate.ts"` if `tsx` is available, otherwise expose it on a hidden dev route or run it in a `vitest`-less node script via `vite-node`; simplest robust option: also call `validateKB()` in dev mode (`import.meta.env.DEV`) from `index.ts` and `console.warn` violations.

**Acceptance criteria (Phase 2):**
- [ ] 100 occupations / ≥160 skills / ≥220 transitions / ≥70 qualifications / 100 market signals.
- [ ] `validateKB()` returns `[]`.
- [ ] ≥25 occupations are vocational/NSQF-level ≤ 5 (breadth across the skilling spectrum, not just white-collar tech).
- [ ] Build passes; a temporary dev check (or console log) shows KB loads with zero violations.

---

## PHASE 3 — Career Passport (profile engine + onboarding + DPDP consent)

**Goal:** the user's living profile, populated via a delightful onboarding, resume extraction, and (later) assessments.

### 3.1 OnboardingPage (`/onboarding`) — a multi-step wizard, newspaper style
Steps (one screen each, progress rail, stick figures per step, sounds on transitions):
1. **"Where are you right now?"** → segment picker: 5 illustrated cards (school student / college student / job seeker / career switcher / working professional) each with a fitting StickFigure pose.
2. **"What are you trying to figure out?"** → goal chips (explore careers / choose education / find first job / change careers / advance / upskill) — stored in passport as part of aspiration seeding.
3. **Education & experience:** education level select; for non-students, add experience rows (title free-text with autocomplete against occupation titles via fuzzy match, years, one-line description).
4. **Constraints:** location (text), relocation toggle, weekly learning hours slider, budget level, income-continuity toggle (only for switcher/professional), languages.
5. **Consent (DPDP)** — see 3.2.
6. **Finish:** creates initial `CareerPassport` (version 1, completeness computed), routes to `/assess`.

Completeness formula (implement in `skillProfile.ts`): basics 20% + skills present 20% + riasec 20% + aptitude 15% + values 10% + aspiration 15%.

### 3.2 DPDP consent flow (visible differentiator — do not skimp)
- Step asks date of birth or "I am 18+" declaration. If under 18: require guardian name + guardian email, and show a plain-language notice that a guardian confirmation is required under **DPDP Act 2023 §9**; log a `guardian` consent row with `granted:false, detail:{method:'email_ack_pending'}` and show a "Guardian consent pending — a confirmation request has been generated" state with a **"Mark as confirmed (guardian has approved)"** action that flips it (hackathon-fidelity verification; label it in the UI footnote as "demonstration flow — production uses DigiLocker-verified guardian consent"). Minors additionally get behavioural-tracking disabled flag in passport (`detail`).
- Everyone: a "What data we use and why" panel — a small newspaper-styled table (data item → purpose → where stored) + checkboxes (required processing consent; optional: store history in cloud). Log rows in `guidance_consents`.
- Settings page (Phase 9) gets the matching controls (view/export/delete).

### 3.3 Resume / experience extraction (LLM-assisted, evidence-tagged)
- On PassportPage: "Add from resume" — a textarea (paste resume text) + file note ("paste text; PDF parsing not required"). New function in `ai.ts`: `extractProfileFromResume(text): Promise<{skills:{name:string; proficiency:1|2|3|4; evidence:string}[]; experiences:{title:string; years:number; description:string}[]; education?:…}>` using usage type `resume_extract`, JSON mode, prompt in Appendix B.
- Post-process deterministically in `skillProfile.ts`: match extracted skill names → canonical `skillId` via name/alias case-insensitive + simple token match; unmatched skills dropped with a UI note. Create `SkillClaim`s with `evidence:[{type:'inferred_from_resume', confidence:0.6, description:<quoted line>}]`. **Never mark resume-inferred skills as verified** — UI shows an "unverified" tag with a "Validate" CTA (validation = Phase 4 aptitude/self-rating confirm flow, which appends an `assessed` or `self_reported` evidence item and lifts confidence per Appendix A.4).

### 3.4 PassportPage (`/passport`)
The centerpiece profile: newspaper "identity card" header (name, segment, completeness ring drawn as hand-drawn SVG arc, NSQF-level estimate of current education), sections: **Skills** (grouped by category; each skill: name, proficiency dots (JetBrains Mono), confidence %, evidence popover listing evidence items with type badges), **Experiences**, **Assessment results** (compact RIASEC hexagon, aptitude bars, values list — link to /assess if missing), **Aspiration** card, **Constraints** card (editable). Every edit bumps `passport.version`, logs `profile_edit` progress event, and (after Phase 5) triggers recompute with a toast: "Your career landscape has been updated."

**Acceptance criteria (Phase 3):**
- [ ] Full onboarding flow works signed-out (localStorage) and signed-in (Supabase row appears).
- [ ] Under-18 path forces guardian step; consent rows logged; over-18 path skips it.
- [ ] Resume paste produces canonical-skill claims tagged `inferred_from_resume` with confidence 0.6 and quoted evidence; unmatched names surfaced, not silently invented.
- [ ] Passport completeness updates live; design matches house style (Playfair headers, mono labels, stick figures, sounds).

---

## PHASE 4 — Assessment Engine (deterministic scoring, LLM only converses)

### 4.1 AssessmentHubPage (`/assess`)
Four module cards (Interests / Aptitude / Values / Aspirations) with status (not started / done + retake), estimated minutes, and a completeness meter feeding the passport. Newspaper "examination hall" flavor; StickFigure `reading`/`thinking`.

### 4.2 RIASEC interest inventory (`/assess/interests`) — `engine/riasec.ts`
- **36 items** (6 per dimension), each a short work-activity statement ("Repair an electrical appliance", "Analyse a dataset to find a pattern", "Teach someone a new skill"…), answered on a 5-point like/dislike scale. Write items yourself in the O*NET Interest Profiler *style* (public-domain methodology): concrete activities, India-relatable, no gendered or class-coded phrasing, balanced white-collar/vocational activities within every dimension.
- Store items in `riasec.ts` as `{ id, dimension, textKey }` (textKey → i18n). Scoring: sum per dimension, normalize 0–100. Output `RiasecScores` + top-3 code (e.g., "ISA").
- UI: one item per screen, big tap targets, `sounds.quizAnswer()`, progress bar, swipe-friendly; results screen shows a hand-drawn SVG hexagon/radar (own component `RiasecHexagon.tsx` — stroke style matching stick figures) + a two-line deterministic interpretation per top dimension.

### 4.3 Aptitude mini-tests (`/assess/aptitude`) — `engine/aptitude.ts`
- Four timed mini-modules, 6 questions each, 5 minutes total: **numerical** (arithmetic/ratio/percent word problems), **verbal** (analogy, sentence completion, comprehension one-liners), **logical** (series, odd-one-out, syllogism), **spatial** (mental rotation/paper folding rendered as inline SVG figures — draw simple hand-drawn-style SVGs).
- Author 12 questions per module in the file (2 forms × 6) so retakes vary; deterministic answer key; score = correct/6 scaled 0–100 with a small speed bonus (max +10) — formula in Appendix A.2. Timer UI in JetBrains Mono; `sounds.tick()` on last 10 seconds.
- Results: four ink-bar scores + honest caption: "A 5-minute screener, not a full psychometric battery — treat as a first signal."

### 4.4 Work values (`/assess/values`) — `engine/values.ts`
- A **forced-choice card sorter**: 15 pairwise choices ("Higher pay, longer hours" vs "Balanced hours, moderate pay"…) covering the six `WorkValues` dimensions; deterministic tally → normalized 0–100 profile. Drag/tap interactions with pop sounds.

### 4.5 Aspiration elicitation (`/assess/aspirations`) — conversational (the LLM's proper job)
- Chat UI (reuse AskAIPanel patterns / streaming via `streamChat`) with usage type `aspiration`. System prompt (Appendix B.2) makes the model a warm interviewer that asks **max 5 focused follow-ups** (long-term vision, why, non-negotiables, role models, timeline) then outputs a fenced JSON `Aspiration` object which the frontend parses (deterministic post-processing maps mentioned dream roles → `dreamOccupationIds` via fuzzy title match against KB).
- Fallback "quick form" (statement + horizon + theme chips) for users who skip chat.
- On completion: save assessment row, merge into passport.

**Acceptance criteria (Phase 4):**
- [ ] All four modules complete end-to-end, write `guidance_assessments` rows, and merge into the passport (visible on /passport immediately).
- [ ] RIASEC/aptitude/values scoring is 100% deterministic (pure functions; add 2–3 inline dev assertions or a tiny test with known answer sets).
- [ ] Aspiration chat produces a parsed `Aspiration` object; dream roles resolve to KB occupation ids where possible; graceful JSON-parse fallback to quick form.
- [ ] Timed aptitude UX works on mobile; retake uses alternate form.

---

## PHASE 5 — Matching Engine (multi-objective, segment-weighted, diverse)

**Goal:** `engine/matching.ts` — the deterministic heart. No LLM anywhere in this phase except optional narration polish.

### 5.1 Pipeline (implement exactly this staged flow)
```text
passport → hard filters → candidate generation → per-candidate 11-dimension scoring
→ segment weight profile (engine/weights.ts, Appendix A.1) → composite score
→ diversity-aware grouping → RecommendationSet (with explanation objects)
```
1. **Hard filters:** education below `educationMin` AND no qualification route existing → exclude is WRONG — instead never hard-exclude on education alone (a pathway can close it); only exclude when constraints make it impossible (e.g., `canRelocate:false` + occupation flagged region-locked — our KB has no region locks, so in practice hard filters exclude nothing; keep the hook for honesty).
2. **Candidate generation:** union of (a) top-40 by RIASEC cosine similarity, (b) top-30 by skill-overlap, (c) all occupations reachable ≤2 transition hops from any experience occupation, (d) `dreamOccupationIds`, (e) 8 random exploration seeds from underrepresented clusters. Dedupe → ~50–70 candidates.
3. **Component scores (0–100 each, formulas in Appendix A.3):** interest (RIASEC cosine), aptitude (weighted match vs occupation aptitudeProfile), values (1 − normalized distance), skill (proficiency-weighted coverage of requirements), transferable (best transition-edge strength from user's experience occupations × transfer relevance), experience (years in same cluster), aspiration (1.0 if dream occupation, 0.7 same cluster as dream, theme keyword overlap otherwise), market (demandIndex adjusted by trend), progression (count+strength of outgoing transitions + isEmerging bonus), learningFeasibility (inverse of SGI vs weeklyLearningHours), geographic (neutral 70 unless relocation constraint interacts with market regions). Set `dataAvailable:false` with score 50 (neutral) when the passport lacks that signal (e.g., no aptitude test yet) — and surface that in explanations ("take the aptitude screener to sharpen this").
4. **Composite:** weighted sum with the segment's weight profile; **confidence** from passport completeness + mean evidence confidence (thresholds in A.5).
5. **Diversity grouping:** assign each recommendation to exactly one group; guarantee the final set shown = top 3 `best_fit` + 2 `growth` (high progression/market, rising) + 2 `easiest_transition` (highest transferable+skill, lowest SGI) + 1–2 `aspiration` + 2 `exploration` (high interest, different cluster than best_fit, at least one `isEmerging`) + 1–2 `vocational_entrepreneurial` (top vocational or entrepreneurialFit match). No two `best_fit` from the same cluster.

### 5.2 `engine/explain.ts`
Deterministic explanation builder: `topReasons` templated from the 3 highest weighted components with concrete nouns ("Your Investigative interest (82) closely matches this role's profile", "Your Excel and operations experience transfer directly — see 3 matched skills"); `whyNotHigher` from the 2 lowest components with actionable counterfactuals computed by re-running the composite with a hypothetical bump ("If your SQL reaches Intermediate, overall fit rises 71 → 76") — implement `counterfactualDelta(passport, occupationId, skillId, newProficiency)`.

### 5.3 RecommendationsPage (`/recommendations`) — "Your Career Landscape"
- Newspaper front-page layout: masthead "THE CAREER LANDSCAPE — edition for <name>", dateline row (JetBrains Mono: generated date, passport vN, KB version — source-traceability made visible), grouped sections with editorial labels ("BEST CURRENT FIT", "GROWTH BETS", "EASIEST TRANSITIONS", "YOUR ASPIRATION", "WORTH EXPLORING", "BUILD & OWN").
- Each card: title, NCO code + NSQF entry level (mono chips), composite score as a hand-drawn ink gauge, confidence badge, top-2 reasons, 3 skill-gap chips, demand chip **always with period+region** ("Demand 78 · rising · 2025-H2 · metro-south"), buttons: "Why this?" (opens `WhyPanel` — full component-score bars with weights, whyNotHigher, evidence links) and "Build my pathway" → `/pathway/:occupationId`. Everything also links to the existing JobDetail dossier ("Read the full dossier").
- `recompute()` in GuidanceContext now calls the real engine, persists a `guidance_recommendations` snapshot, and is invoked on passport change (debounced).
- Optional narration: a single `narrate` LLM call may rewrite the deterministic `topReasons` into one warm paragraph per top-3 card — but display the deterministic bullet list in WhyPanel regardless, and if the LLM fails, show bullets only. LLM receives ONLY deterministic facts to rephrase (Appendix B.3).

**Acceptance criteria (Phase 5):**
- [ ] Recommendations are fully reproducible: same passport + KB ⇒ identical scores (pure functions).
- [ ] Distinct passports produce visibly different landscapes (verify with two seeded personas: a class-12 student vs. a 5-yr retail manager — the plan's build check).
- [ ] Every card shows component transparency (WhyPanel), confidence, freshness-stamped market chip, and at least one counterfactual.
- [ ] Group guarantees hold (incl. ≥1 emerging + ≥1 vocational/entrepreneurial option in every landscape).
- [ ] Snapshot rows written with passportVersion + kbVersion.

---

## PHASE 6 — Skill Gaps & Multi-Route Pathways (the "pathways" in the PS title)

### 6.1 `engine/gaps.ts`
- `computeGapReport(passport, occupationId): GapReport`. Per required skill: `severity = max(required − current, 0) × importance × (2 − confidence)` normalized 0–100 (A.6). `sgi` = normalized weighted sum of severities (0 = ready). `readiness = 100 − sgi`. `transferable` lists user skills matching requirements at ≥ required proficiency, citing which experience/evidence supplied them.

### 6.2 `engine/pathways.ts`
- `buildPathwayPlan(passport, occupationId): PathwayPlan` producing **exactly 3 routes**:
  1. **`direct`** ("Fastest"): validate transferable skills → close top gaps via shortest qualifications teaching them → portfolio project → target. Months = Σ qualification months adjusted by weeklyLearningHours (A.7).
  2. **`stepping_stone`** ("Lower-risk"): find intermediate occupation X where `transition(current→X)` and `transition(X→target)` both exist and SGI(X) < SGI(target) − 15; route via X ("earn while you learn"). If no such X, substitute an apprenticeship-type qualification route labeled accordingly.
  3. **`qualification_first`** ("Credential route"): the NSQF qualification with highest `preparesFor` relevance (respecting `educationMin`, showing NCrF-style multiple-entry note when it crosses levels, e.g., ITI → Diploma → Degree progression), then target.
- Each route: `tradeoff` one-liner ("Fastest but self-driven", "Slower, income continues", "Strongest credential, highest cost"), honest `estMonths`, confidence (drops when data sparse).

### 6.3 PathwayPage (`/pathway/:occupationId`)
- Header: occupation masthead (title, NCO, NSQF, demand chip w/ freshness).
- **Gap report section:** transferable skills ("What you already bring" — green-ink checks with evidence popovers), gaps table (skill, current→required proficiency dots, severity ink-bar, top learning pick), big **Readiness dial** (hand-drawn arc, Playfair number) + SGI in mono.
- **Route comparison:** 3 route cards side-by-side (mobile: swipe) with tradeoffs, months, confidence → "Choose this route".
- **Interactive Pathway Graph** — `components/guidance/PathwayGraph.tsx`: hand-rolled SVG node-edge map in the stick-figure ink style (nodes = rough-edged rectangles: current state, steps, stepping-stone roles, target; edges = slightly wobbly hand-drawn lines with arrowheads; the chosen route inked solid, alternates dashed). Tap a node → bottom-sheet: why reachable, what transfers, what's missing, which qualification closes it, est. effort. Animate route drawing with `motion` path animation on mount. This graph is the demo centerpiece — make it beautiful within the house style.
- **Steps checklist:** chosen route's `PathwayStep`s as a checkable list; checking one logs a `milestone_done`/`module_completed` progress event → Phase 7 replanning. Learning steps link out via `providerHint` labels ("Find on Skill India Digital Hub / SWAYAM") — plain text links to their public portals, no API pretense.
- Save plan to `guidance_pathways`; surface active plans on HomePage (Phase 10).

**Acceptance criteria (Phase 6):**
- [ ] Gap math is proficiency-weighted (never binary present/absent) and evidence-confidence-adjusted; readiness dial consistent with SGI.
- [ ] 3 labeled routes with distinct tradeoffs for at least 90 of 100 occupations (validator spot-check: run plan builder across all occupations for a seeded persona in a dev check; no crashes, ≥2 routes minimum everywhere).
- [ ] Pathway graph is interactive (node tap → detail sheet), animated, and matches the hand-drawn aesthetic.
- [ ] Checking a step persists progress and visibly updates readiness (after Phase 7, recompute; in this phase, local update acceptable).

---

## PHASE 7 — Dynamic Replanning Loop ("guidance that updates as you grow")

1. **Recompute triggers** in GuidanceContext: passport edit, assessment completion, skill validation, pathway step completion → debounce 1.5s → recompute recommendations + refresh active pathway gap reports; bump `passport.version`.
2. **"What changed" diff:** compare new vs previous RecommendationSet (persisted snapshots): compute per-occupation score deltas and rank moves. Show a dismissible newspaper "STOP PRESS" banner on /recommendations: "Since you completed *Intermediate SQL*: Data Analyst 71→78 (▲3 ranks), readiness for Business Analyst 64→71." Component: `components/guidance/StopPress.tsx`, `sounds.notification()` on appear.
3. **Skill validation flow** (from Passport or Gap table): a 3-question self-audit per skill (concrete "can you do X" checkboxes) → appends `self_reported` evidence at confidence 0.75, or "I've completed a course/credential" (+link/name field) → `credentialed` at 0.9 (A.4). This is the RPL-inspired "recognise what you already have" moment — label the section "Recognition of Prior Learning".
4. **Streak/gamification tie-in:** reuse `useStreak` — progress events count toward the existing streak; celebrate route completion with StickFigure `celebrating` + `sounds.achievement`-style fanfare.

**Acceptance criteria (Phase 7):**
- [ ] Completing a learning step measurably changes readiness and can reorder recommendations, with the StopPress diff shown.
- [ ] Evidence ledger on a skill shows accumulated history (resume → self-audit → credential) with rising confidence.
- [ ] No recompute storms (debounced; recompute is synchronous/fast — pure TS over static KB).

---

## PHASE 8 — Grounded Counselor Chat, Multilingual & Voice

### 8.1 Grounded counselor (upgrade `AskAIPanel` / add global "Counselor" entry)
- New `ai.ts` function `streamCounselorChat(messages, groundingContext)` (usage `counselor`, streaming). Before each call, the frontend assembles a **grounding context block** (deterministic!): compact passport summary, top-8 current recommendations w/ scores, active pathway + gaps, relevant KB entries (occupations/qualifications mentioned in the user's message via fuzzy title scan). System prompt = Appendix B.4 with the hard policy rules (never invent statistics/requirements; always cite which profile facts drove an answer; recommend human counselor escalation triggers: user distress, high-cost decisions, strong conflicts — respond with the escalation card).
- **Escalation card:** a styled inline card "This looks like a decision worth discussing with a human counselor — NCS runs free career centres" + link to ncs.gov.in counseling page. Trigger also via deterministic keyword check (self-harm/distress words) BEFORE the LLM call.
- Add counselor entry points: floating on /recommendations and /pathway ("Ask why · Ask what-if").

### 8.2 Multilingual (EN / HI / TE, extensible)
- `src/app/i18n/`: `index.ts` exports `useT()` hook + `LanguageProvider` (localStorage `cc_guidance_lang`); `en.ts` is the source of truth; `hi.ts` (Hindi) and `te.ts` (Telugu) — **author these translations directly in the files** (you are multilingual; write natural, semantically-equivalent translations — not literal — especially for RIASEC/values items where meaning-equivalence matters; keep occupation names bilingual "Data Analyst · डेटा विश्लेषक").
- Translate at minimum: onboarding, all four assessments (every item), recommendations page labels + group names, pathway page labels, consent flow (legally the most important), nav. KB `descriptionKey`s resolve through i18n. LLM outputs: pass `lang` into prompts ("respond in Hindi") for counselor/aspiration chats.
- Language switcher: onboarding step 1 top-right + Settings. Default from `navigator.language`.

### 8.3 Voice I/O (accessibility for low-literacy users)
- `src/app/utils/voice.ts`: `speak(text, lang)` via `speechSynthesis` (voice pick by lang tag hi-IN/te-IN/en-IN, graceful no-op if unavailable) and `listen(lang): Promise<string>` via `webkitSpeechRecognition`/`SpeechRecognition` with feature detection.
- Add: mic button on counselor + aspiration chat inputs; speaker button on assessment items (reads the question in current language) and on recommendation cards (reads title + top reason). Settings toggle "Voice assistance". Show a graceful "not supported on this browser" toast when unavailable.

**Acceptance criteria (Phase 8):**
- [ ] Counselor answers cite profile facts, refuses invented statistics ("my knowledge base doesn't include a salary figure for this — here's the demand signal we do have, observed 2025-H2"), and escalation card triggers correctly.
- [ ] Full assessment + recommendation flow completable entirely in Hindi and Telugu (spot-check semantic quality; consent flow fully translated).
- [ ] Voice: question read-aloud + mic dictation work in Chrome; unsupported browsers degrade gracefully.

---

## PHASE 9 — Explainability, Responsible AI & Data Controls

1. **WhyPanel everywhere** (built in Phase 5) — audit that every score shown anywhere in the app has a tap-path to its components and evidence. Add a small mono footnote on all recommendation surfaces: "Deterministic scoring over KB kb-2026.06.1 · profile v<N> · LLM used for wording only."
2. **Responsible AI page/panel** (route `/how-it-works`, linked from footer + Settings): newspaper explainer with sections: how scoring works (with a worked example), what the LLM does and does not do, fairness statement (historical transition prevalence is one signal, never destiny — with the exact reframe copy: "This transition is less common historically, but the evidence does not justify excluding it"), limits ("a 5-minute screener, not a clinical battery"), DPDP summary, KB sources note (NCO-2015 · NSQF · NQR · curated indicative market data).
3. **Data controls in Settings:** view raw passport JSON, **Export my data** (downloads JSON of passport + assessments + recommendations + consents), **Delete guidance data** (confirm dialog → deletes all six-table rows + localStorage; keep account), language + voice toggles, consent history list (from ledger).
4. **Fairness self-check (dev):** a dev-only script/function that runs matching for 6 seeded personas differing only in gender-neutral vs regional-language names and location — assert identical outputs (our engine never reads name/gender; the check proves it and becomes a pitch slide).

**Acceptance criteria (Phase 9):**
- [ ] /how-it-works exists, house-styled, with the worked example.
- [ ] Export downloads valid JSON; delete wipes and app returns to pre-onboarding state cleanly.
- [ ] Persona fairness check passes and is documented in README.

---

## PHASE 10 — UX Integration, Home Rework & Legacy Feature Wiring

1. **HomePage rework (retain the beloved structure, re-aim the funnel):** hero keeps its editorial style but the primary CTA becomes "Chart my pathway" → /onboarding (or /recommendations when a passport exists, showing a compact "landscape snapshot" strip: top-3 recs + readiness of active pathway + StopPress teaser). Keep trending/explore sections below. Add a 4-step "How it works" strip (Assess → Match → Pathway → Grow) with the four new stick-figure poses.
2. **New StickFigure poses:** add `climbing` (ladder/steps — pathways), `mapping` (looking at a map — recommendations), `graduating` (cap toss — qualification), `pointing` (guide — counselor) to `StickFigure.tsx`, matching stroke style and idle animations. New sounds: `assessComplete` (rising triad), `pathUnlock` (short sweep+chime) in `sounds.ts`.
3. **Navigation:** Navbar + BottomNav get the new IA: Home · Explore (existing job search/dossier world) · **Pathways** (passport/assess/recommendations/pathway hub) · Counselor · Settings. Keep every legacy route reachable (History/Favorites/Compare under Explore or profile menu). Update `OnboardingTour` to include the new flow.
4. **Legacy features feed the passport (integration, the "system" feel):**
   - **Quiz** (`QuizPage`) completion → writes an `inferred_from_activity` interest hint (nudges RIASEC pre-fill banner: "Quiz suggests Investigative leanings — take the full interest inventory").
   - **MoodMatch/Favorites:** favoriting a career adds it to aspiration `themes`/exploration seeds (candidate-generation input (d)).
   - **JobDetailPage:** inject a "YOUR FIT" section when passport exists: composite score + top reasons + readiness + "Build pathway" CTA (reuse WhyPanel). This is the money-moment: the existing beloved dossier becomes personalized.
   - **CareerTransitionPage & CareerRoadmapPage:** keep them, add a banner cross-link: "Want this grounded in your profile? Open your Pathway plan" when relevant.
   - **InterviewPrep:** on pathway completion of final step, suggest interview prep for the target occupation.
5. **PWA/manifest:** update app name/short_name to "CareerCase — AI Career Pathways" and description mentioning SIH PS alignment; keep icons.
6. **README.md rewrite:** project intro (PS title + MSDE/NCVET), architecture diagram (ASCII), the deterministic-engine principle, KB stats, setup (env vars incl. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AI_PROXY_URL`; both SQL migrations), and the differentiation checklist (Appendix C summary).

**Acceptance criteria (Phase 10):**
- [ ] New user lands on Home → onboarding → assess → recommendations → pathway without dead ends; returning user sees the snapshot strip.
- [ ] Dossier page shows personalized fit when passport exists, nothing when not.
- [ ] All legacy pages reachable and functional; nav coherent on mobile; new poses/sounds live.

---

## PHASE 11 — Final QA & Hardening

Run this checklist; fix everything that fails:
1. `npm run build` clean; no TypeScript errors; no console errors on any route.
2. **Persona E2E #1 (student):** 17-y-o class-12 student, Hindi language, guardian consent path, all 4 assessments, gets a diverse landscape (verify ≥1 vocational + ≥1 emerging), opens a pathway, graph interactive, completes a step, StopPress appears.
3. **Persona E2E #2 (professional):** 28-y-o retail manager, resume paste (write a realistic sample resume for the test), career_switcher weights visibly favor transferable/easiest-transition groups, stepping-stone route exists for their target, RPL validation raises a skill's confidence.
4. Signed-out → full flow in localStorage → sign in → data syncs to Supabase.
5. AI failure drill: with the proxy unreachable, assessments/matching/pathways (all deterministic) still fully work; only chat/narration/extraction degrade with friendly errors. **State this explicitly in README — the core system works without the LLM.**
6. Language switch mid-flow keeps state; voice buttons degrade gracefully in Firefox.
7. Lighthouse-style pass: images/CLS fine, tap targets ≥44px on new pages, reduced-motion respected.
8. `validateKB()` returns `[]`; fairness persona check passes.
9. Update `PROJECT_BRIEF.md` and `changes.md` describing the new architecture (keep the "no payments" rule notes).

---

## APPENDIX A — Formulas & Weights (normative)

### A.1 Segment weight profiles (`engine/weights.ts`) — weights sum to 1.0 per row
| dimension | school_student | college_student | job_seeker | career_switcher | professional |
|---|---|---|---|---|---|
| interest | .24 | .18 | .10 | .08 | .06 |
| aptitude | .22 | .16 | .10 | .08 | .06 |
| values | .08 | .08 | .06 | .10 | .10 |
| skill | .04 | .10 | .18 | .12 | .16 |
| transferable | .02 | .04 | .10 | .22 | .12 |
| experience | .00 | .02 | .08 | .10 | .20 |
| aspiration | .12 | .12 | .08 | .08 | .08 |
| market | .06 | .10 | .16 | .08 | .08 |
| progression | .08 | .08 | .06 | .04 | .10 |
| learningFeasibility | .06 | .08 | .06 | .08 | .02 |
| geographic | .08 | .04 | .02 | .02 | .02 |

Expose weights in the WhyPanel ("ranked with the *career switcher* lens — change segment in Passport to re-rank").

### A.2 Aptitude scoring: `score = round(100 × correct/6) + speedBonus`, `speedBonus = min(10, round(10 × timeRemaining/totalTime))`, capped at 100.

### A.3 Component score formulas (all clamp 0–100):
- interest: `100 × cosine(userRIASEC, occRIASEC)` (vectors of 6).
- aptitude: `100 × Σ(userApt_d × occAptImportance_d) / Σ(100 × occAptImportance_d)` over 4 dimensions.
- values: `100 − (Σ|userVal_d − occVal_d| / 6) ` scaled appropriately (mean absolute diff subtracted from 100).
- skill: `100 × Σ over reqs (min(current,required)/required × importance) / Σ importance`, current from SkillClaim (missing skill ⇒ 0).
- transferable: `100 × max over user experience occupations E of (edgeStrength(E→target))`, 0 if none; +10 bonus if ≥3 requirement skills already at required level via experience evidence.
- experience: `min(100, 20 × yearsInSameCluster)`.
- aspiration: dream occupation 100; same cluster as a dream 70; ≥1 theme keyword in occupation title/description 55; else 30.
- market: `demandIndex + (rising:+10, stable:0, declining:−15)`.
- progression: `min(100, 25 × outgoingEdgeCount + 30 × maxOutStrength + (isEmerging ? 15 : 0))`.
- learningFeasibility: `100 − sgi`, then −15 if `estMonths(direct route) × 4 > weeklyLearningHours × 40` heuristic (keep simple, note it).
- geographic: 70 default; 85 if user region ∈ market.regions; 55 if not and canRelocate=false.

### A.4 Evidence-type base confidences: self_reported .75 · inferred_from_resume .60 · inferred_from_activity .50 · assessed .85 · credentialed .90. SkillClaim confidence = `1 − Π(1 − c_i)` capped .97 (independent evidence accumulation).

### A.5 Recommendation confidence: high if completeness ≥ 75 AND mean evidence confidence ≥ .7; low if completeness < 40; else medium.

### A.6 Gap severity: `sev = (required − current)/4 × importance × (2 − claimConfidence)`, normalized to 0–100 over the occupation's requirement set. `SGI = 100 × Σ sev_weighted / Σ maxPossible`.

### A.7 Route months: qualification steps use `typicalMonths × clamp(6/weeklyLearningHours, 0.6, 2.0)`; validate/project steps fixed 1; transition_role steps use edge `typicalYears × 12 × 0.75` (partial tenure).

---

## APPENDIX B — LLM prompt templates (adapt wording, keep the constraints verbatim in spirit)

**B.0 Global policy block (append to every system prompt):**
```
Hard rules:
- NEVER invent salary figures, demand statistics, occupation requirements, course names, or institutions.
- Only reference facts present in the provided CONTEXT block; if asked beyond it, say what data is missing.
- Distinguish clearly: fact (from context) / inference / user preference.
- Use calibrated language: "strong option to explore", "plausible route". Never "perfect career", "you are destined".
- Always preserve user agency: offer alternatives, never a single verdict.
```

**B.1 Resume extraction (`resume_extract`, JSON mode):** role: precise information extractor; input resume text; output JSON `{skills:[{name, proficiency:1-4, evidence:"<verbatim line from resume>"}], experiences:[{title, years, description}], educationLevel?}`; rules: extract only what is literally supported by the text, evidence must quote the source line, do not infer soft skills without explicit support, max 25 skills.

**B.2 Aspiration interviewer (`aspiration`, streaming):** warm, curious counselor persona; asks ONE question at a time, max 5 follow-ups covering: long-term vision, the "why" beneath it, non-negotiables/values, people they admire, timeline; then outputs exactly one fenced ```json block matching the `Aspiration` interface (statement ≤ 2 sentences in the user's own words, themes as lowercase keywords, dreamOccupationIds as plain title strings for the frontend to resolve). Respond in the user's chosen language.

**B.3 Narration polish (`narrate`, JSON mode):** input: deterministic facts (occupation title, top 3 reasons with scores, 1 counterfactual); output: `{paragraph: string}` — one warm 2-sentence paragraph that rephrases ONLY the given facts, no new numbers, no new claims.

**B.4 Grounded counselor (`counselor`, streaming):** persona: experienced, honest Indian career counselor; CONTEXT block = passport summary + current recommendations with component scores + active pathway/gaps + retrieved KB snippets; behavior: answer what-ifs using the provided counterfactual deltas where present, explain scores by pointing at components, suggest the human-counselor escalation card for: distress, family-conflict decisions, high-cost education choices, or when the user repeatedly rejects all options; keep answers ≤ 180 words unless asked; respond in the user's language.

---

## APPENDIX C — Pitch positioning cheat-sheet (write into README; useful for the team's slides)

1. **One-liner:** "We are not predicting what career you belong to. We build a living map between where you are, where you could go, and the evidence-backed steps that take you there."
2. **vs. SIDH (MSDE's own hub):** SIDH claims "AI-based personalised recommendations" with no published methodology. We are the transparent, explainable, NCO-2015/NSQF-grounded recommendation methodology such a hub needs underneath that claim — complementary infrastructure, not a competing portal.
3. **Differentiators to demo in order:** ① 100 real NCO-coded occupations w/ NSQF levels (vs. predecessors' 3 hardcoded careers) ② deterministic multi-objective scoring w/ visible component breakdown + counterfactuals ③ proficiency-weighted Skill Gap Index (never binary) ④ 3-route interactive pathway graph (direct / stepping-stone / qualification-first, NCrF multiple-entry aware) ⑤ segment-specific ranking lenses (student ≠ professional — named in the PS, almost nobody does it) ⑥ evidence-ledger skill passport w/ RPL validation ⑦ dynamic replanning "STOP PRESS" loop ⑧ visible DPDP §9 guardian-consent flow ⑨ Hindi/Telugu + voice for low-literacy users ⑩ the whole core works even with the LLM offline — the AI narrates, deterministic engines decide.
4. **Honesty notes judges respect:** demand data labeled "indicative snapshot, 2025-H2"; aptitude labeled "screener, not clinical battery"; guardian verification labeled "demo flow — production: DigiLocker".

---
*End of implementation plan. KB_VERSION, formulas, interfaces and phase order are normative. Everything else may be adapted tastefully — within the design DNA.*
