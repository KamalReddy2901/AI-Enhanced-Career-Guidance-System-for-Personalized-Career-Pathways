# CareerCase UI Overhaul — Handoff Notes

> Read this **before** `CareerCase_UI_Overhaul_Prompt.md`. It records where the
> spec docs disagree with the actual repo, and what has already been done, so
> you build on reality instead of fighting it.

## Status

- **Phase 1 is DONE** (committed to `main`). `src/styles/theme.css` now contains
  the editorial tokens and utility classes, added **additively** — no existing
  token was changed. Do not redo Phase 1.

## What Phase 1 already gives you (reuse — do not reinvent)

Tokens: `--ink` `--paper` `--paper-raised` `--ink-soft` `--ink-faint` `--rule`
`--accent-news` `--accent-soft` `--shadow-hard` `--shadow-hard-sm`
`--radius-sketch`.

Utility classes: `.card-sketch`, `.card-sketch--wobble`, `.rule-top`,
`.rule-bottom`, `.label-caps`, `.font-display`, `.font-mono-ui`.

`::selection` and an accent `:focus-visible` ring are set. The editorial colors
are also exposed as Tailwind colors via `@theme` (`bg-ink`, `text-paper`,
`text-accent-news`, etc.).

Fonts (Playfair Display, Inter, JetBrains Mono) are already wired in
`src/styles/fonts.css` — do not re-import them.

## Repo realities the specs get wrong — reconcile these

1. **The red accent is `--accent-news`, NOT `--accent`.** The existing `--accent`
   (`#e9ebef`) is a neutral shadcn token used across current components. Never
   override it. Everywhere the spec says `var(--accent)` for the red accent, use
   `var(--accent-news)` (or Tailwind `accent-news`).

2. **Animation library is `motion/react` (Framer Motion), not GSAP.** The repo
   is already built on it (see `src/app/components/StickFigure.tsx`). Keep it as
   the primary animation layer and implement the spec's motion with it wherever
   practical (reveals, magnetic CTAs via `useMotionValue`, tab underline via
   `layoutId`, count-ups, stroke draws via `pathLength`). Add GSAP +
   ScrollTrigger **only** where scrub-driven pinned scroll genuinely needs it —
   the Pathway scrollytelling and the Showpiece Hero. If you add GSAP, register
   plugins once and always use `useGSAP` with a scope ref (auto-cleanup). Do not
   remove `motion/react`.

3. **Components use NAMED exports** (e.g. `export function StickFigure`), not
   default exports. Match the existing convention in every file you touch.

## Non-negotiables (also in the spec)

- OFF-LIMITS except for imports: `src/app/engine/`, `src/app/data/knowledge/`,
  `src/app/services/`, `worker/`. Never change function signatures, scoring math,
  Supabase calls, or i18n key semantics.
- Keep every visible string routed through i18n (en/hi/te). Stay `.tsx`.
- Preserve existing `data-testid`s; add kebab-case testids + `aria-label` +
  `focus-visible` to new interactive elements. Respect `prefers-reduced-motion`.
- Animate transform/opacity only; no `transition: all`; one red accent per
  screen; keep PWA + passport print working.
- **Run `npm run typecheck && npx vite build` after every phase — both must pass
  before continuing.** Prefer one phase per PR for easy regression isolation.
