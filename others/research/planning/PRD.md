# PRD — CareerCase SIH Planning Deliverables

## Original problem statement
User owns CareerCase (github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways, live at careercase.pages.dev): React 18 + TS + Vite + Tailwind v4 PWA on Cloudflare Pages, Supabase auth/data (email + Google), Cloudflare Worker Groq proxy with key rotation. For Smart India Hackathon PS "AI-Enhanced Career Guidance System for Personalized Career Pathways" (MSDE/NCVET, Smart Education).

## Stack
React 18 + TypeScript + Vite + Tailwind v4, Cloudflare Pages, Supabase (auth + 6 guidance tables), Cloudflare Worker (Groq proxy, key rotation), PWA, Node 22 build. UI: Playfair Display / Inter / JetBrains Mono, newsprint editorial aesthetic, StickFigure SVG animations, WebAudio sounds. motion/react (Framer), GSAP (non-hero use), three.js (PathwayPage only, richVisuals-gated).

## Architecture
```
Onboarding + Assessments → Career Passport → Deterministic TS matching engine
→ NCO-2015 KB (100 occupations) → Recommendations → Pathway (3 routes)
→ Optional Groq LLM (counselor, aspiration, narration)
```

## What has been implemented

### Jun 2026 (Fork 1)
- `/app/CareerCase_SIH_Implementation_Plan.md` — 11-phase implementation plan
- `/app/EXECUTOR_AGENT_PROMPT.md` — executor agent handover prompt

### Jun 2026 (Fork 2 — UI Overhaul Prompt)
- `/app/CareerCase_UI_Overhaul_Prompt.md` — 10-phase GSAP/three.js overhaul executor prompt
- `/app/CareerCase_Showpiece_Hero_Addendum.md` — pinned-scroll showpiece hero addendum (optional, now superseded)

### Aug 2026 (Fork 3 — Hero Fix, this session)
- **FIXED P0 crash**: `careercase.pages.dev` was throwing `THREE.WebGLRenderer: Error creating WebGL context.` and showing a white error screen
- Root cause: External AI agents added `ShowpieceHero` (GSAP pinned scroll + THREE.js `FloatingNewsprintScene`) to `HomePage.tsx`. WebGL context fails on most devices including CI crawlers.
- **Created** `src/app/components/hero/WordCloudMasthead.tsx` — new hero replacing ShowpieceHero:
  - `ScrollingTitles` word-cloud backdrop (dozens of real career titles in 12 scrolling rows)
  - StickFigure (searching pose) with aptitude/aspiration/ability annotations
  - Playfair headline: "Find the work that fits your whole story." (i18n: en/hi/te)
  - Guidance-aware CTAs (Start/Continue assessment + Explore careers)
  - Zero THREE.js, zero GSAP pinned scroll
- **Updated** `StaticMasthead.tsx` — stripped THREE.js lazy-load, pure StickFigure fallback
- **Updated** `HomePage.tsx` — removed ShowpieceHero/showpieceCapable, always uses WordCloudMasthead
- Build: `npm run typecheck` → 0 errors. `npm run build` → clean.
- Pushed commit `81614db` to main → Cloudflare Pages auto-deploy triggered

## Pending / Backlog

### P0 — Must do before SIH demo
- [ ] Supabase migration: run `supabase-guidance-migration.sql` in Supabase SQL editor
- [ ] Worker setup: deploy Cloudflare Worker, set `GROQ_API_KEYS` secret
- [ ] Frontend env: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AI_PROXY_URL` on Cloudflare Pages

### P1 — Demo quality
- [ ] Explainability tap-paths audit on assessment-result screens (transparency is core differentiator)
- [ ] 2-minute judge demo script (step-by-step click-path)
- [ ] Full acceptance-criteria audit vs 11-phase implementation plan
- [ ] Voice (Chrome) mic dictation + question read-aloud verification

### P2 — Polish
- [ ] Multilingual coverage: Hindi/Telugu translations for occupation names, reasons, pathway steps (prioritize demo click-path)
- [ ] Motion/haptics/sounds consistency audit
- [ ] PathwayPage THREE.js (PathwayLineScene) — add ErrorBoundary in case WebGL fails on demo device

## Known issues / notes
- `ShowpieceHero` and `FloatingNewsprintScene` still exist in codebase but are no longer used by HomePage — can be deleted later (they still build cleanly since they're lazy imports).
- PathwayPage `PathwayLineScene` (THREE.js) is still present, gated by `useRichVisuals()` (lg screen + hardware > 4 cores + no reduced-motion). Low risk but add ErrorBoundary before demo.
- `@types/node` is in devDependencies and typecheck now passes clean.
