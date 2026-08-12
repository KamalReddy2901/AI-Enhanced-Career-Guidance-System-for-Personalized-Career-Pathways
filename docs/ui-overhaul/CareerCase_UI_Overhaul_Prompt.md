# CareerCase — Studio-Grade UI/UX Overhaul (Executor Prompt)

> Paste this entire document into your coding agent (Kiro / Codex) at the repo root of
> `AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways`.
> Execute phases IN ORDER. After every phase run `npm run typecheck && npx vite build` — both must pass before moving on.

---

## ROLE & MISSION

You are a senior design engineer at a world-class digital studio (think Locomotive, Basement Studio, Studio Freight). Your mission: transform CareerCase's current UI — which reads as "AI-generated, cluttered, low-effort" — into a **visually stunning, highly functional, studio-grade product** with GSAP + Three.js micro-animations, while **preserving and elevating** its unique hand-drawn newsprint identity (black & white, stick figures, sketchy borders, editorial typography).

This is NOT a re-theme. It is a discipline pass: hierarchy, whitespace, rhythm, motion craft, and detail obsession. Every screen must look intentional, like a designer sweated over it.

### Non-negotiable constraints
1. **DO NOT touch business logic.** All files in `src/app/engine/`, `src/app/data/knowledge/`, `src/app/services/`, `worker/` are OFF-LIMITS except for importing from them. Never change function signatures, scoring math, Supabase calls, or i18n keys' semantics.
2. **Stay in TypeScript.** All components remain `.tsx`. Never convert to `.jsx`.
3. **Keep the brand:** black & white newsprint, stick figures (`StickFigure.tsx`), sketchy borders, Playfair Display headlines. Elevate it; never replace it with a generic SaaS look.
4. **Keep i18n working.** Every visible string continues to route through the existing i18n system (en/hi/te). Never hardcode English text into redesigned components if it was translated before.
5. **Keep the PWA + mobile-first behavior.** BottomNav on mobile, Navbar on desktop. Test every layout at 375px and 1440px widths.
6. **Accessibility:** all interactive elements keep/get `data-testid` (kebab-case), `aria-label`s, visible `focus-visible` states, and every animation respects `prefers-reduced-motion`.
7. **After EVERY phase:** `npm run typecheck && npx vite build` must pass. If it fails, fix before continuing.

---

## PHASE 0 — Dependencies & Motion Infrastructure

```bash
npm i gsap @gsap/react three @react-three/fiber @react-three/drei react-fast-marquee
```

Create `src/app/motion/` with:

**`src/app/motion/gsap.ts`** — central GSAP setup:
```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(ScrollTrigger, Flip);
export { gsap, ScrollTrigger, Flip };
export const EASE = { out: 'power3.out', outHard: 'power4.out', inOut: 'power2.inOut', elastic: 'back.out(1.4)' };
export const DUR = { xs: 0.18, sm: 0.3, md: 0.55, lg: 0.8 };
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

**`src/app/motion/useReveal.ts`** — a hook that staggers children into view on mount/scroll:
- `gsap.from(targets, { y: 28, opacity: 0, duration: DUR.lg, stagger: 0.08, ease: EASE.out })`
- Uses `ScrollTrigger` with `start: 'top 85%'`, `once: true`.
- If `prefersReducedMotion()`, set final state instantly (`gsap.set`).

**`src/app/motion/TextReveal.tsx`** — headline component: splits text into lines/words wrapped in `overflow-hidden` spans; animates `yPercent: 110 → 0` with `stagger: 0.06`, `ease: power4.out`. Use for every page H1. Must accept translated strings (re-run split when language changes).

**`src/app/motion/Magnetic.tsx`** — wrapper for primary CTAs: on `pointermove`, translate child up to 6px toward cursor with `gsap.quickTo` (`duration: 0.3`); reset on leave with elastic ease. Disabled on touch devices and reduced motion.

**`src/app/motion/PageTransition.tsx`** — route-level transition mounted in `RootLayout`: on route change, new page content fades/slides in (`opacity 0→1, y: 16→0, 0.45s power3.out`). Keep it subtle — no full-screen wipes.

Rule for ALL GSAP usage in components: use `useGSAP` from `@gsap/react` with a `scope` ref (auto-cleanup). Never leak ScrollTriggers.

---

## PHASE 1 — Design Tokens & Global Styles (the de-clutter foundation)

Edit `src/styles/theme.css` (extend, don't nuke Tailwind mappings):

```css
:root {
  --ink: #0A0A0A;            /* never pure #000 for large fills */
  --paper: #F9F8F6;          /* app background */
  --paper-raised: #FFFFFF;   /* cards */
  --ink-soft: #4A4A4A;       /* secondary text */
  --ink-faint: #9A9A94;      /* metadata, captions */
  --rule: #0A0A0A;           /* hairline borders */
  --accent: #E63946;         /* ONE red accent — breaking news red */
  --accent-soft: #FFD166;    /* rare highlight (marks, highlighter strokes) */
  --shadow-hard: 4px 4px 0px var(--ink);
  --shadow-hard-sm: 2px 2px 0px var(--ink);
  --radius-sketch: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
```

Also in theme.css add utility classes:
- `.font-display` → Playfair Display; `.font-mono-ui` → JetBrains Mono; body stays Inter.
- `.card-sketch` → `background: var(--paper-raised); border: 2px solid var(--ink); box-shadow: var(--shadow-hard); border-radius: 2px;`
- `.card-sketch--wobble` → same but `border-radius: var(--radius-sketch);` (use sparingly: max ONE wobble card per viewport, for the hero/featured item only).
- `.rule-top` / `.rule-bottom` → `border-top: 1px solid var(--ink)` — newspaper column rules.
- `.label-caps` → `font-family: JetBrains Mono; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-soft);`
- Paper grain: add a fixed, pointer-events-none `body::after` overlay using a tiny inline SVG noise (feTurbulence) at `opacity: 0.035`. NO external image dependencies.
- Custom text selection: `::selection { background: var(--accent); color: var(--paper); }`
- Focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }`

### Typography scale (enforce app-wide — this alone kills 50% of the clutter)
- **H1 (one per page, always TextReveal):** `font-display text-5xl md:text-6xl tracking-tighter leading-[1.05]` — black ink.
- **H2 section heads:** `font-display text-2xl md:text-3xl tracking-tight` preceded by a `.label-caps` kicker (e.g., `SECTION 02 — APTITUDE`). The kicker + rule line above every section is the signature editorial move: `<div class="rule-top pt-3"><span class="label-caps">…</span></div>`.
- **Body:** `text-base leading-relaxed text-[var(--ink-soft)]`, max-width `65ch`. NEVER full-width paragraphs.
- **Data/scores:** always `.font-mono-ui`.
- Delete any usage of text-3xl+ for non-heading UI; demote decorative headings.

### Global de-clutter laws (apply to every page in Phases 3–7)
1. **One primary action per viewport.** Everything else is ghost/secondary.
2. **Whitespace 2×:** section vertical padding `py-16 md:py-24`; card internal padding `p-6 md:p-8`; gaps `gap-6` minimum.
3. **Max 3 font sizes + 2 weights per screen** (excluding H1).
4. **Borders OR shadows OR background tint — never all three on one element.** Prefer the `.card-sketch` recipe and nothing else.
5. **Kill decoration that carries no information:** redundant icons next to labels, badge soup, emoji, double borders, colored chips of more than 2 colors. Icons only where they aid scanning (lucide-react, `strokeWidth={1.5}`, size 16–18).
6. **Left-align.** No centered content columns except the passport page and empty states.
7. **Progressive disclosure:** anything below the primary content goes behind tabs/accordions ("The fine print" pattern) instead of stacking 8 cards vertically.

---

## PHASE 2 — Core Component Kit (restyle once, reuse everywhere)

Restyle these shared pieces FIRST so pages inherit polish automatically:

**Buttons** (wherever the Button component/classes live):
- Primary: `bg-[var(--ink)] text-[var(--paper)] border-2 border-[var(--ink)] font-mono-ui text-sm tracking-wide px-6 h-11 rounded-full`. Hover: `translate-y(-2px)` + `box-shadow: 4px 4px 0 var(--accent)` (transition `transform .18s, box-shadow .18s` — NEVER `transition: all`). Active: `translate-y(0) scale(.98)`, shadow collapses to `--shadow-hard-sm`.
- Secondary/ghost: transparent, `border-2 border-[var(--ink)]`, hover fills ink/paper inverse.
- Wrap primary CTAs in `<Magnetic>`.
- Loading state: label swaps to three pulsing dots (CSS), width preserved (no layout jump).

**Inputs/textareas/selects:** `bg-transparent rounded-none border-0 border-b-2 border-[var(--ink)] focus:border-[var(--accent)] focus:ring-0 font-mono-ui`. Label above as `.label-caps`. Error text in `--accent` with a small hand-drawn squiggle underline (inline SVG).

**Dialogs/Sheets (Radix):** overlay `bg-[var(--ink)]/40 backdrop-blur-[2px]`; panel is `.card-sketch` sliding up/in via GSAP (`y: 24, opacity: 0 → 1, 0.4s power4.out`). Close X top-right, mono caption title.

**Tabs:** `h-auto`, transparent list with `border-b border-[var(--ink)]`; triggers are `.label-caps`; active gets `border-b-4 border-[var(--accent)]` + ink text. Animate an underline slider with GSAP Flip between triggers.

**Navbar (`Navbar.tsx`):** `sticky top-0 z-50 bg-[var(--paper)]/90 backdrop-blur-md border-b border-[var(--ink)]`. Left: masthead wordmark in Playfair Display italic + `.label-caps` date line ("EST. 2025 — VOL. II"). Right: nav links `.label-caps` with sketchy-underline hover (animated SVG path draw, 0.25s), language switcher as a mono pill `EN / हि / తె`. Reduce nav items to ≤5; overflow goes into a "More" menu.

**BottomNav (`BottomNav.tsx`):** paper background, `border-t-2 border-[var(--ink)]`, 4–5 items max, icons `strokeWidth={1.5}`, active item = ink filled circle behind icon + label in mono; tap = quick GSAP scale pop (0.9→1, back.out). Safe-area padding.

**`ScoreBar.tsx`:** track = 1px ink hairline box; fill = solid ink bar that animates width 0→value with GSAP on reveal (`0.9s power3.out`), value ticker counts up in mono (`gsap.to` on a proxy object with `snap: 1`). Percentage label sits at bar end.

**`RiasecHexagon.tsx`:** hand-drawn look — 1.5px ink stroke, no fill gradients; the profile polygon fill `var(--accent)` at 12% opacity with 2px accent stroke; vertices draw in sequentially via stroke-dashoffset GSAP animation on reveal; axis labels in `.label-caps`. Tapping a vertex opens the WhyPanel (keep existing handler).

**`WhyPanel.tsx`:** rename visual to an editorial footnote: opens with GSAP height/opacity expand; header `label-caps "WHY THIS SCORE — EVIDENCE"`; evidence rows are hairline-ruled lines (like a ledger), each with mono weight values. Hovering the trigger shows a sketchy underline + 0.5° tilt on the score element.

**`StopPress.tsx`:** convert to a `react-fast-marquee` breaking-news ticker: `bg-[var(--accent)] text-[var(--paper)]`, `label-caps`, `★ STOP PRESS ★` separators, `speed={40}`, `pauseOnHover`, one line tall.

**`StickFigure.tsx`:** keep drawings. Add optional `animated` prop: on reveal, strokes draw in via stroke-dasharray/offset GSAP tween (0.8s power2.inOut); add a 4s idle breathing loop (`y: ±2, rotation: ±1`, repeat: -1, yoyo). Reduced motion → static.

**Skeletons/empty states:** skeleton = hairline-bordered boxes with a subtle diagonal pencil-hatch CSS animation (no gray shimmer blobs). Empty states = one small stick figure + one Playfair sentence + one CTA, centered, generous padding.

**Toasts (sonner):** `toastOptions` styled as `.card-sketch` with mono text, slide from top-right.

---

## PHASE 3 — HomePage + RootLayout (first impression)

`HomePage.tsx` becomes a front page of a newspaper, not a widget dump:

1. **Masthead hero (above the fold):** kicker `label-caps "THE CAREERCASE DAILY — PERSONALIZED EDITION"`, H1 via TextReveal (existing translated headline), one-sentence sub in 65ch, ONE primary CTA ("Start your assessment" / continue where left off) + one ghost CTA. Right side (desktop): the Three.js hero (Phase 8) or animated StickFigure on mobile.
2. **StopPress ticker** directly under the masthead.
3. **"Your progress" strip:** a single horizontal `.card-sketch` showing assessment completion as a thin ink progress rule + mono % + next-step CTA. If nothing started, show "Begin Chapter 1" instead. ONE card, not four.
4. **Bento section "Today's picks":** 12-col grid — one large featured occupation card (`card-sketch--wobble`, spans 7 cols) + two stacked small cards (5 cols). Mobile: vertical stack. Each card: kicker (SAFE/STRETCH/FRONTIER in mono), Playfair title, one-line reason, match % in mono. Hover: lift 3px + hard shadow grows; entrance staggered via `useReveal`.
5. **Sections for tools (quiz, mood match, compare, counselor):** collapse into a ruled editorial index — a list of rows (`rule-top` each) with mono numbers `01–04`, Playfair item name, small arrow that slides 4px right on hover. NOT a grid of icon cards.
6. Everything below the fold reveals with ScrollTrigger staggers.

`RootLayout.tsx`: mount `PageTransition`, keep keyboard shortcuts, ensure `Breadcrumb` restyles to mono `label-caps` with `/` separators, hidden on Home.

---

## PHASE 4 — Assessment Flow (AssessmentHubPage, AssessRiasecPage, AssessAptitudePage, AssessValuesPage, AssessAspirationsPage, QuizPage)

**AssessmentHubPage:** chapters of a casefile. Each assessment = one ruled row (not cards): mono number, Playfair name, duration + status in mono, right-aligned state (`— NOT STARTED / ● IN PROGRESS / ✓ FILED` as text, no badge chips). Completed rows get a hand-drawn checkmark SVG that draws in. One primary CTA on the recommended-next row only.

**Question screens (all assess pages):** ONE question per viewport, centered column `max-w-2xl`:
- Top: hairline progress bar (2px ink fill animating width per question) + mono `Q 07 / 24`.
- Question text in Playfair `text-2xl md:text-3xl`, revealed via TextReveal on each question change.
- Options: full-width sketch-bordered rows; hover lifts 2px; selection = ink fill inversion animated 0.2s + small accent tick draw; keyboard 1–4 selection preserved if present.
- Question transitions: old question slides out left (`x: -24, opacity: 0`), new slides in from right (`x: 24 → 0`) — GSAP timeline, 0.35s, never blocking input.
- Voice read-aloud button: mono pill with a 3-bar CSS waveform that animates while speaking; pulses `scale 1→1.05` loop when active.
- Aptitude timers: mono countdown, turns `--accent` under 10s with a subtle 1Hz pulse.
- Likert scales (values/RIASEC): custom radio row 1–5 rendered as ink circles that fill on select with a pop (back.out), labels `label-caps` at the ends only.

**AssessAspirationsPage:** keep AI flow; textarea styled per Phase 2; while AI parses, show a "typesetting…" loader: three mono dots + a small stick figure at a desk (existing art if available). Extracted aspirations render as ruled ledger rows with confidence in mono, each row revealing with stagger.

**Results (within these pages):** every score visual (ScoreBar/RiasecHexagon) animates on reveal, and EVERY displayed score is tappable → WhyPanel (audit this — it's a demo requirement; add missing tap-paths).

---

## PHASE 5 — Recommendations + Comparison (RecommendationsPage, ComparisonPage, FavoritesPage)

**RecommendationsPage — the showpiece:**
- Header: kicker `label-caps "YOUR CAREER LANDSCAPE — {n} MATCHES"`, H1 TextReveal.
- Group filter tabs: `ALL / SAFE / STRETCH / FRONTIER` as Phase 2 tabs. **Switching filters MUST use GSAP Flip**: capture state, toggle visibility, `Flip.from(state, { duration: 0.5, ease: 'power3.inOut', stagger: 0.04, absolute: true, onEnter/onLeave fades })`.
- Cards: `.card-sketch`, kicker = group name in mono (SAFE gets ink, STRETCH gets accent-soft underline, FRONTIER gets accent — the ONLY color coding), Playfair occupation title, match % as a big mono numeral with count-up on reveal, one-line "why" preview, footer row: NSQF level + sector in `label-caps`. Hover: lift + shadow grow + title gets sketchy underline draw. Click → JobDetail/why.
- Group guarantee note ("at least one from each group") as an italic Playfair footnote under the tabs, not a banner.
- Grid: 1 col mobile / 2 tablet / 3 desktop, `gap-6 md:gap-8`; entrance staggered.

**ComparisonPage:** newspaper comparison table — hairline rules only, `label-caps` row headers, mono values; winner cell per row gets a hand-drawn accent circle (SVG ellipse stroke draws in on reveal). Kill any heavy colored table styling.

**FavoritesPage:** same card recipe; empty state per Phase 2.

---

## PHASE 6 — Pathway, Roadmap, Gaps (PathwayPage, PathwayGraph.tsx, CareerRoadmapPage, CareerTransitionPage, JobDetailPage, JobOverviewPage)

**PathwayPage — scrollytelling pathway:**
- Restructure as a vertical timeline: a center (desktop) / left (mobile) 2px ink spine drawn progressively via ScrollTrigger scrub (`scaleY 0→1`, `transformOrigin: top`).
- Each step = `.card-sketch` alternating sides (desktop), pinned to spine with an ink node circle that fills + pops when its ScrollTrigger activates; a small stick figure "walks" checkpoint art at milestones.
- Step content: mono kicker `STEP 03 — 6 MONTHS`, Playfair title, ≤2 lines description, expandable detail (accordion) for the rest. Completed steps: ink-filled node + hand-drawn check draw-in; current step: accent node with slow pulse.
- Progress header: sticky mini-bar with mono `4/9 STEPS FILED` + thin ink progress rule.
- Marking a step done: node pops (elastic), spine fill advances with GSAP, sonner toast confirms.

**Skill gaps (wherever gap analysis renders — JobDetail/Transition/Gaps view):** ledger rows: skill name (Playfair, `text-lg`), then a dual bar — required level as hairline outline box, current level as ink fill animating in; gap delta in mono `−2` in accent. Sort by gap desc. Each row taps open gap advice (existing AI flow) in a Phase 2 dialog.

**JobDetailPage:** editorial article layout — headline, `label-caps` byline row (sector · NSQF · demand), 65ch body, pull-quote style salary/demand figures in huge mono with count-up, sticky bottom CTA bar on mobile ("Build my pathway"). Sections separated with `rule-top` kickers, revealed on scroll.

---

## PHASE 7 — Passport, Counselor, Onboarding, Settings, Auth, remaining pages

**PassportPage:** make it a physical artifact — centered document on paper background: double ink border + inner hairline, `label-caps` "REPUBLIC OF CAREERCASE — CAREER PASSPORT", monospace field grid (NAME / RIASEC CODE / TOP MATCH / NSQF), stamp: circular SVG "ASSESSED ✓ 2026" in accent that scales in with elastic + slight rotation on reveal, fake MRZ barcode strip (mono `<<<<` line) at bottom. Print/share buttons in a toolbar OUTSIDE the document. Keep jspdf/print flows working (`print.css` may need matching updates).

**CounselorPage:** comic-strip chat — user bubbles: ink-filled rounded rects, right; AI bubbles: `.card-sketch` speech bubble with a small hand-drawn tail, left, StickFigure avatar (24px) beside; AI text renders with a typewriter effect (streamed or ~18ms/char with a caret) that respects reduced motion (instant). Typing indicator: three ink dots bounce. Input pinned bottom, Phase 2 style, mono send button. Bubbles enter with `y: 12, opacity: 0, 0.25s`. Session/chat logic untouched.

**OnboardingPage + DPDP consent:** one panel per step, GSAP slide left/right between steps, mono step dots. Consent step: contract-styled card (Playfair heading "The Fine Print", ruled clause rows, each toggle a Phase 2 switch); on accept, a hand-drawn signature squiggle SVG draws next to the button (0.6s), then advance. Language pick step: three big sketch cards (EN/हिंदी/తెలుగు) with native-script Playfair samples, hover lift, selected gets accent border + tick draw.

**AuthPage:** split editorial layout (desktop): left = masthead + stick figure illustration; right = minimal Phase 2 form, max-w-sm. Mobile: stacked. No card-in-card nesting.

**SettingsPage / HistoryPage / PricingPage / HowItWorksPage / InterviewPrepPage / SimulationPage / MoodMatchPage / NotFoundPage:** apply the kit: kicker+rule section heads, ruled rows over card grids, Phase 2 controls, one primary CTA, `useReveal` entrances. NotFound: big Playfair "404 — Page not filed", confused stick figure (draw-in), CTA home.

---

## PHASE 8 — Three.js Signature Moments (exactly TWO — restraint is studio behavior)

Install usage: `@react-three/fiber` + `@react-three/drei`. Both scenes: `<Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 1.5]}>`, transparent background, soft ambient + one directional light, `frameloop="demand"` where possible, lazy-loaded via `React.lazy` + `Suspense` (fallback: static StickFigure), rendered ONLY on desktop ≥1024px AND `!prefersReducedMotion()` AND `navigator.hardwareConcurrency > 4`. Mobile always gets the 2D fallback. Zero impact on TTI: chunk must be code-split.

**Moment 1 — Home hero:** floating "newsprint sheets": 5–7 thin white planes with ink-edge borders (line segments), slowly drifting/rotating (`useFrame` with tiny sinusoidal offsets), reacting subtly to pointer (parallax ±0.1 rad via lerped mouse). Monochrome only. It should read as drifting newspaper pages, not confetti.

**Moment 2 — Pathway header:** a 3D ink line (TubeGeometry along a gentle CatmullRom curve) with small sphere nodes at steps; camera slowly dollies along it; nodes glow accent when hovered (raycast) showing a mono HTML label (`<Html>` from drei). Sits behind the page header at 40% height, `pointer-events` limited to nodes.

Do NOT add three.js anywhere else.

---

## PHASE 9 — Sound & Haptics polish (tiny, optional layer)

If the app already has sound/haptic hooks, attach them consistently: option select (soft tick), assessment complete (page-flip), pathway step done (stamp thunk), toast (subtle). Volume ≤ 0.2, all behind the existing sound setting. If no infrastructure exists, add `navigator.vibrate(10)` on mobile primary actions only, guarded.

---

## PHASE 10 — Global QA sweep (do not skip)

1. `npm run typecheck && npx vite build` — clean.
2. Visit EVERY page at 375px and 1440px. Checklist per page: one H1, kicker+rule sections, no orphan default-styled cards/buttons, 65ch text, entrance animation fires once (no re-trigger jank on scroll up), no layout shift from animations (animate transform/opacity ONLY — never width/height/top/left except GSAP-managed expands), no `transition: all` anywhere (grep for it and remove).
3. Language switch to Hindi and Telugu on: Home, AssessmentHub, one question screen, Recommendations, Pathway, Passport — no overflow/clipped text; TextReveal re-splits correctly on language change.
4. Reduced motion: enable OS setting → app fully usable, content visible instantly, no three.js.
5. Lighthouse (mobile) on Home: Performance ≥ 85, CLS < 0.05. Three.js chunks lazy-loaded (verify network tab).
6. Keyboard-only pass: tab order sane, focus-visible ring shows everywhere, dialogs trap focus.
7. All existing tests/data-testids intact; add `data-testid` to every new interactive element (kebab-case, e.g., `recommendations-filter-safe`, `pathway-step-3-complete-btn`, `passport-share-btn`).
8. Grep for leftover clutter: emoji in UI strings (remove), >2 accent colors on any screen, badge chips with >2 colors, centered `.App` containers.
9. PWA still installs; print/PDF of passport still renders correctly with `print.css`.

---

## DEFINITION OF DONE
- A judge opening any screen should think "a design studio built this": calm paper surfaces, confident Playfair headlines, mono data, ONE red accent, hard-shadow sketch cards, and motion that feels engineered (staggered reveals, Flip sorting, drawn strokes, magnetic CTAs, two restrained 3D moments).
- Zero regressions: engines, Supabase, worker AI calls, i18n, PWA, print — all untouched and working.
- Build green, typecheck green, mobile flawless.
