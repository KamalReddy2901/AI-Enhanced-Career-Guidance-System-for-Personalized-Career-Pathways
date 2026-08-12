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
