# Prompt to give your executor AI agent (copy-paste everything below the line)

---

You are working on my existing repository **CareerCase** (this repo is already connected — do NOT scaffold a new project). It is a React 18 + TypeScript + Vite + Tailwind v4 PWA deployed on Cloudflare Pages, with Supabase (email + Google auth, history/favorites tables) and a Cloudflare Worker at `worker/` that proxies all AI calls to Groq with API-key rotation. I am upgrading this app into my Smart India Hackathon submission for the MSDE/NCVET problem statement **"AI-Enhanced Career Guidance System for Personalized Career Pathways."**

Your complete, authoritative specification is in the file **`CareerCase_SIH_Implementation_Plan.md`** at the repo root (I am attaching it / it is committed in the repo). Follow it exactly. Key operating rules:

1. **Read the plan's Section 1 (Context Primer) and Section 2 (Ground Rules) in full before writing any code.** Then explore the existing codebase (`src/app/`, `worker/src/`) to confirm the inventory described there.
2. **Execute Phases 1 through 11 strictly in order.** At the end of each phase: run the build, verify EVERY acceptance criterion listed for that phase, fix failures, then commit with the message `Phase N: <title>` before starting the next phase. Never skip ahead, never merge phases.
3. **Preserve the design DNA at all costs** (plan §2.1): the newsprint paper texture, black-ink-on-white editorial look, Playfair Display headlines, Inter body, JetBrains Mono labels, hand-drawn SVG stick figures, synthesized WebAudio sounds, haptics, sparing color pops, motion micro-interactions. Every new screen must look like it was drawn by the same hand as the existing app. Do not introduce generic AI-dashboard styling, purple gradients, or new UI libraries.
4. **The deterministic-engine principle is non-negotiable** (plan §1.2): all scores, matches, skill gaps, and pathway routes come from pure TypeScript engines over the curated NCO-2015/NSQF knowledge base. The Groq LLM is used only for conversation, resume/aspiration extraction, narration polish, and translation — never as the source of any number or requirement. Interfaces, formulas, and weights in the plan's Appendix A and `engine/types.ts` spec are normative — match them exactly.
5. **Never break existing features** (dossier, simulation, quiz, mood match, comparison, transition, roadmap, interview prep, favorites, history) and **never reintroduce any payment/credit/paywall logic** — billing was deliberately removed.
6. All new AI calls go through `src/app/services/ai.ts` → the worker with a named `X-Usage-Type`; use JSON mode + defensive parsing as the plan specifies. All new env-dependent behavior must degrade gracefully (signed-out → localStorage; LLM down → deterministic core still fully works).
7. Where the plan asks you to author content (the 100-occupation knowledge base, RIASEC/aptitude/values items, Hindi/Telugu translations), write it carefully yourself at judged-competition quality — real NCO-2015 4-digit codes, differentiated profiles, natural translations. Run the KB validator until it returns zero violations.
8. If you hit a genuine ambiguity or a conflict between the plan and the existing code, the plan wins — except for §2 Ground Rules, which win over everything. If something is truly impossible in this stack, implement the closest faithful alternative and note it in the phase commit message.
9. Finish with the Phase 11 QA checklist fully green, including the two persona end-to-end tests, the AI-failure drill, and the README rewrite described in Phase 10.

Start now with Phase 1. Announce each phase as you begin it, and report acceptance-criteria results at the end of each phase.
