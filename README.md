# CareerCase — AI Career Pathways

CareerCase is an MSDE/NCVET Smart India Hackathon implementation for AI-Enhanced Career Guidance System for Personalized Career Pathways.

## Architecture

Onboarding and assessments flow into a Career Passport, then deterministic matching, skill gaps, three-route pathways, progress and replanning.

The frontend is React/Vite, Supabase provides optional auth and persistence, and the Cloudflare Worker proxies Groq calls. Deterministic TypeScript engines own scores, requirements, gaps, route edges and market labels. The LLM is limited to conversation, extraction, translation and wording polish. The core flow works when the LLM is offline.

## Grounding

The static knowledge base contains 100 occupations, 176 skills, 248 directed transitions, 70+ qualifications and timestamped indicative market signals grounded in NCO-2015/NSQF-style data. Recommendations show profile signals and market freshness.

## Setup

Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_AI_PROXY_URL, then run npm run build. Apply supabase-migration.sql and supabase-guidance-migration.sql in Supabase for cloud persistence; signed-out users use localStorage.

## Responsible AI

The system does not predict destiny or promise a perfect career. Aptitude is a five-minute screener, demand is an indicative snapshot, and pathways are plausible routes. User data can be exported or deleted from Settings. Hindi/Telugu language state and browser voice assistance degrade gracefully when unsupported.
