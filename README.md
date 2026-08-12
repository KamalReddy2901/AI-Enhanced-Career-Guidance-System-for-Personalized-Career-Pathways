# CareerCase — AI Career Pathways

CareerCase is a Smart India Hackathon implementation of the MSDE/NCVET problem statement **“AI-Enhanced Career Guidance System for Personalized Career Pathways.”**

> We are not predicting what career you belong to. We build a living map between where you are, where you could go, and the evidence-backed steps that take you there.

The original CareerCase exploration experience remains intact—career dossiers, day-in-the-life simulations, quiz, mood match, comparisons, transitions, roadmaps, interview preparation, favorites and history—while an evidence-led guidance system adds onboarding, four assessments, a Career Passport, transparent matching, proficiency-weighted gaps, three-route pathways and dynamic replanning.

## Architecture

```text
Onboarding + Resume + Assessments + Legacy activity
                         │
                         ▼
              Evidence-led Career Passport
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
 Pure TypeScript engines          Optional Groq LLM
 matching · gaps · routes         conversation · literal
 explanations · replanning        extraction · translation
          │                       wording polish only
          ▼
 Career landscape → 3 pathway routes → progress evidence
          ▲                                   │
          └──────── debounced recompute ──────┘

 React 18 + Vite + Tailwind v4 PWA
          │
          ├── localStorage (complete signed-out flow)
          ├── Supabase (optional auth + six guidance tables, RLS)
          └── Cloudflare Worker (Groq proxy, model routing, key rotation)
```

## Deterministic-engine principle

All displayed match scores, component weights, confidence labels, Skill Gap Index values, requirements, market labels and pathway edges are produced by pure TypeScript over the versioned static knowledge base. The LLM never invents or decides a number, requirement, transition or route. Every recommendation has a component breakdown, weight lens, missing-data note, “why not higher” counterfactual and version footnote.

If `VITE_AI_PROXY_URL` is absent or unreachable, the core system still works: onboarding, RIASEC, aptitude, work values, Career Passport, matching, gaps and all three pathway routes remain usable. Resume extraction, aspiration structuring, counselor chat and narration show friendly fallback states.

## India-grounded knowledge base

Current release `kb-2026.06.1` contains:

- 100 NCO-2015-coded occupations across professional, vocational and entrepreneurial entry routes
- 164 canonical skills with aliases and evidence mapping
- 300 directed, referentially-valid transition edges
- 105 NSQF-aligned qualifications and learning routes
- 100 timestamped, region-labelled indicative market signals

Demand data is explicitly an indicative snapshot, not a live statistic. The validator checks IDs, NCO shape, ranges, minimum six differentiated skill requirements per occupation, transition reachability, qualification coverage and market coverage.

## Guidance flow

1. Choose one of five user segments and record education, experience, constraints and consent.
2. Complete the 36-item RIASEC inventory, alternating 24-question aptitude screener, 15-pair work-values sorter and up-to-five-question aspiration reflection.
3. Inspect the Career Passport evidence ledger; paste a resume or validate prior learning.
4. Explore a diverse recommendation landscape ranked with the segment-specific lens.
5. Open a target to compare Fastest, Lower-risk and Credential routes on an interactive hand-drawn SVG graph.
6. Complete steps. Evidence confidence and readiness update, recommendations recompute after 1.5 seconds, and STOP PRESS explains score/rank changes.

The aptitude module is a five-minute screener, not a clinical battery. Career options are framed as plausible routes and strong options to explore—not guarantees.

## Responsible AI, privacy and fairness

- Deterministic distress keywords trigger a human-support card before counselor AI is called.
- Counselor context is assembled from the Passport, top recommendations, active gaps and fuzzy-retrieved KB entries; missing facts must be acknowledged.
- Under-18 onboarding includes a DPDP Act 2023 §9 guardian-confirmation demonstration. Production verification is labelled as requiring DigiLocker or an equivalent verified channel.
- Settings provides raw Passport inspection, a complete JSON export, consent history, and deletion from all six cloud guidance tables plus local guidance storage while keeping the account.
- A six-persona fairness regression confirms that names and non-matching regional labels do not alter recommendations. Name and gender are not engine inputs.
- Historical transition prevalence is one signal, never destiny: “This transition is less common historically, but the evidence does not justify excluding it.”

## Differentiation

1. 100 real NCO-coded roles and NSQF entry levels—not three hardcoded careers.
2. Visible deterministic multi-objective scoring and counterfactuals.
3. Proficiency- and evidence-confidence-weighted Skill Gap Index.
4. Interactive direct, stepping-stone and qualification-first route graph.
5. Distinct ranking lenses for students, job seekers, switchers and professionals.
6. Evidence-led Passport with Recognition of Prior Learning validation.
7. Dynamic replanning with an explicit STOP PRESS diff.
8. Visible consent ledger and guardian flow.
9. English/Hindi/Telugu state plus browser voice read-aloud/dictation fallbacks.
10. Deterministic core remains functional when the LLM is offline.

CareerCase is complementary infrastructure for portals such as Skill India Digital Hub: a transparent, explainable NCO/NSQF-grounded methodology underneath personalized recommendations.

## Local setup

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run typecheck
npm run kb:validate
npm run qa:guidance
npm run dev
```

Create `.env.local` as needed:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_AI_PROXY_URL=https://your-worker.example.workers.dev
```

For cloud persistence, apply both `supabase-migration.sql` and `supabase-guidance-migration.sql` in the Supabase SQL editor. The second migration is idempotent and creates `guidance_profiles`, `guidance_assessments`, `guidance_recommendations`, `guidance_pathways`, `guidance_progress` and `guidance_consents` with own-row RLS policies.

The worker reads comma-separated Groq keys from its configured secret/environment. Browser code never needs a Groq key in production.

## Release verification

```bash
npm run build          # strict tsc --noEmit, then Vite production build
npm run kb:validate    # must return violations: []
npm run qa:guidance    # 100 pathway builds, three-route assertion, fairness and diversity
```

The QA script builds pathways for all 100 occupations, checks exactly three distinct route kinds, verifies `readiness = 100 − SGI`, validates all segment weight rows, runs six identity/location fairness fixtures and asserts vocational/entrepreneurial plus exploration diversity.

## Design and product constraints

The UI deliberately preserves CareerCase’s off-white newsprint texture, black-ink editorial layout, Playfair Display/Inter/JetBrains Mono typography, hand-drawn stick figures, synthesized WebAudio cues and restrained accent color. No payments, credits, subscriptions or paywalls are present or permitted.
