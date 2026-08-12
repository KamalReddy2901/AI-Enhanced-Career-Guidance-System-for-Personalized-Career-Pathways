# CareerCase UI Overhaul — Executor Handoff

This folder holds the studio-grade UI overhaul specs and the ground rules for
executing them **against this repo as it actually is**. Read this file first,
then the two spec docs in order:

1. `CareerCase_UI_Overhaul_Prompt.md` — Phases 0–10
2. `CareerCase_Showpiece_Hero_Addendum.md` — the cinematic Home hero (run LAST,
   only after Phase 10 QA passes)

Execute A→Z, in order. After **every** phase run `npm run typecheck && npx vite build`;
both must pass before continuing.

---

## Already done — do NOT redo

**Phase 1 is committed** (`src/styles/theme.css`, additive only). Build on it:

- The red accent is **`--accent-news` (#e63946)**, NOT `--accent`. The existing
  `--accent` (#e9ebef) is a **neutral shadcn token** used across current
  components — never override it. Everywhere the specs say `var(--accent)` for the
  red accent, use `var(--accent-news)` (Tailwind color `accent-news` is also wired
  via `@theme`).
- Available now: tokens `--ink --paper --paper-raised --ink-soft --ink-faint
  --rule --accent-news --accent-soft --shadow-hard --shadow-hard-sm
  --radius-sketch`; classes `.card-sketch`, `.card-sketch--wobble`, `.rule-top`,
  `.rule-bottom`, `.label-caps`, `.font-display`, `.font-mono-ui`. `::selection`
  and an accent `focus-visible` ring are set. Reuse these — do not invent parallels.
- Fonts are already wired in `src/styles/fonts.css` (Playfair Display, Inter,
  JetBrains Mono). Do not re-import them.

---

## Two repo realities the specs get wrong — reconcile these

1. **Animation library.** This repo already uses **`motion/react` (Framer Motion)**,
   not GSAP. `StickFigure.tsx` and others depend on it. The specs assume GSAP.
   **Decision:** keep `motion/react` as the primary animation layer and implement
   the specs' motion with it wherever practical (reveals, magnetic CTAs via
   `useMotionValue`, tab underline via `layoutId`, count-ups, stroke draws via
   `pathLength`). Add **GSAP + ScrollTrigger only** where scrub-driven pinned
   scroll genuinely needs it: the Pathway scrollytelling and the Showpiece Hero.
   If you add GSAP, register plugins once and always use `useGSAP` with a `scope`
   ref (auto-cleanup); never leak ScrollTriggers. Do not remove `motion/react`.

2. **Exports.** Components use **named exports** (e.g. `export function StickFigure`),
   not default exports. Match the existing convention in every file you touch.

---

## Hard constraints (from the specs, non-negotiable)

- **Off-limits** except for importing from them: `src/app/engine/`,
  `src/app/data/knowledge/`, `src/app/services/`, `worker/`. Never change function
  signatures, scoring math (NCO-2015 / NSQF), Supabase auth/RLS calls, or i18n key
  semantics.
- Stay `.tsx`. Keep every visible string routed through i18n (en/hi/te); never
  hardcode English into a previously-translated component. Re-split headline
  text-reveals on language change.
- Keep PWA + mobile-first (BottomNav mobile, Navbar desktop). Test 375px and 1440px.
- Preserve all existing `data-testid`s; add kebab-case `data-testid`, `aria-label`,
  and visible `focus-visible` to every new interactive element; respect
  `prefers-reduced-motion` everywhere.
- Animate transform/opacity only (never width/height/top/left except lib-managed
  expands); no `transition: all`; one red accent (`accent-news`) max per screen;
  keep `print.css` / passport PDF working.

Deliver small, reviewable commits — ideally one phase per PR — so regressions are
easy to isolate.
