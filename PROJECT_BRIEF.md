# CareerCase — Current Handoff

CareerCase is a free, mobile-first PWA for exploring careers with AI dossiers, simulations, comparisons, transition plans, roadmaps, interview prep, quiz, mood matching, favorites, and history.

## Current architecture

- Frontend: React 18 + TypeScript + Vite + Tailwind
- Auth/data: Supabase
- AI proxy: Cloudflare Worker with Groq key rotation only
- Billing: removed. No credits, no subscriptions, no paywall, no payments
- Routes: all feature pages remain, including `/pricing` as a neutral access/info page

## What matters for future edits

- AI requests are routed through [src/app/services/ai.ts](src/app/services/ai.ts)
- The worker in [worker/src/index.ts](worker/src/index.ts) only proxies AI calls and rotates keys
- UI should stay free-first and never reintroduce a balance or purchase flow
- Any remaining credits/paywall wording in old prose should be treated as legacy, not as live behavior

## Relevant files

- [src/app/services/ai.ts](src/app/services/ai.ts)
- [worker/src/index.ts](worker/src/index.ts)
- [src/app/pages/PricingPage.tsx](src/app/pages/PricingPage.tsx)
- [src/app/pages/JobDetailPage.tsx](src/app/pages/JobDetailPage.tsx)

## Guidance architecture

CareerCase now includes an evidence-led Career Passport, deterministic RIASEC/aptitude/values scoring, segment-aware matching over the NCO/NSQF knowledge base, proficiency-weighted gaps, three pathway routes, grounded counselor chat, Hindi/Telugu language state, voice fallbacks, and local export/delete controls. The core assessments, matching and pathways remain usable without the LLM.

The release boundary is validated at 100 occupations, 164 skills, 300 directed transitions, 105 learning routes and 100 market snapshots. Strict TypeScript is enforced before every build. `scripts/guidance-qa.ts` covers all occupations, route construction, segment weights, diversity and six fairness fixtures. Progress evidence drives a debounced Passport → recommendation → pathway recompute loop and a STOP PRESS rank/score diff.
