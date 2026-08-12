# CareerCase — Showpiece Hero Addendum (run ONLY after the base UI overhaul is complete and QA'd)

> Paste this into your coding agent AFTER `CareerCase_UI_Overhaul_Prompt.md` has been fully executed
> and Phase 10 QA passed. This addendum upgrades ONLY the Home hero into a cinematic, scroll-driven
> sequence. It must be delete-safe: removing one component restores the Phase 3 masthead exactly.

---

## ROLE & MISSION

You are the same senior design engineer. The app is now clean and studio-grade. Your final task:
replace the static Home masthead with a **scroll-driven cinematic hero** — the kind of pinned
scroll sequence seen on award-winning motion sites — while keeping the newsprint/stick-figure
brand and guaranteeing zero risk to the rest of the app.

### Hard constraints (same as base prompt, plus)
1. Touch ONLY: one new component folder + minimal wiring in `HomePage.tsx`. Nothing else.
2. **Delete-safe boundary:** all new code lives in `src/app/components/hero/ShowpieceHero.tsx`
   (+ sibling files in that folder). `HomePage.tsx` gets exactly this wiring:
   ```tsx
   const ShowpieceHero = React.lazy(() => import('../components/hero/ShowpieceHero'));
   // in JSX:
   {useShowpiece ? (
     <Suspense fallback={<StaticMasthead />}>
       <ShowpieceHero />
     </Suspense>
   ) : (
     <StaticMasthead />
   )}
   ```
   where `StaticMasthead` is the EXISTING Phase 3 masthead extracted into its own component
   (extraction is a pure move — zero visual change). `useShowpiece` is computed once (see Gating).
3. The showpiece must never block interaction: the primary CTA ("Start your assessment" /
   continue) is visible and clickable within 1 second of load, before/without any scrolling.
4. `npm run typecheck && npx vite build` must pass. Lighthouse mobile Performance on Home
   must stay ≥ 85 (mobile never loads the showpiece — see Gating).

### Gating (jank insurance — non-negotiable)
Compute once on mount:
```ts
const useShowpiece =
  window.innerWidth >= 1024 &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  (navigator.hardwareConcurrency ?? 4) > 4 &&
  (navigator as any).deviceMemory !== undefined ? (navigator as any).deviceMemory >= 4 : true;
```
- Mobile / tablet / reduced-motion / weak hardware → `StaticMasthead` (already beautiful, zero risk).
- Also add a runtime fuse: measure FPS over the first 90 frames of the pinned sequence
  (`gsap.ticker`); if average < 40fps, kill all ScrollTriggers of the hero, unpin, and swap to
  `StaticMasthead` state instantly. Log nothing visible to the user.

---

## THE SEQUENCE (desktop, ~2.5 viewport-heights of scroll, pinned)

One GSAP timeline driven by a single pinned ScrollTrigger:
```ts
ScrollTrigger.create({ trigger: heroRef, start: 'top top', end: '+=250%', pin: true, scrub: 0.8 });
```
`scrub: 0.8` (smoothed), never `scrub: true` raw. All animation on `transform`/`opacity` only.
Use `will-change: transform` on animated layers, remove it on complete.

### Beat 0 — Load-in (time-based, NOT scroll: plays once on mount, 1.2s total)
1. Paper background is already visible (no flash).
2. Kicker line `label-caps "THE CAREERCASE DAILY — PERSONALIZED EDITION"` types on
   letter-by-letter (18ms/char, mono caret that blinks twice then disappears).
3. Headline (Playfair, existing translated H1) sets itself like typesetting: words drop in from
   `yPercent: 110` inside overflow-hidden line masks, `stagger: 0.05`, `ease: power4.out` —
   but with a 1px ink baseline rule that draws left→right under each line as it lands
   (scaleX 0→1, transformOrigin left).
4. Primary CTA + ghost CTA fade/rise in (`y: 12, opacity: 0 → 1, 0.4s`) — interactive immediately.
5. A scroll cue at the bottom: `label-caps "SCROLL TO OPEN THE CASE"` with a hand-drawn down
   arrow (SVG stroke draws in, then loops a gentle 6px bob). Cue fades out at 5% scroll progress.

### Beat 1 — "Sheets assemble" (scroll 0% → 40%)
Reuse/extend the Phase 8 three.js scene (floating newsprint sheets) inside the hero canvas:
- At rest the 5–7 sheets drift scattered in depth (as built in Phase 8).
- As the user scrolls, the sheets **converge and stack** into a neat pile at the right third of
  the viewport: lerp each sheet's position/rotation from its drift pose to a target stack pose,
  driven by the scrubbed timeline progress (pass progress into the R3F scene via a shared ref or
  zustand-free mutable object — no React re-renders per frame).
- Sheet edges keep their ink line borders; the top sheet's face fades in a texture of the
  CareerCase masthead (render the wordmark to an offscreen canvas → `CanvasTexture`; regenerate
  when language changes).
- Monochrome only. Lighting unchanged from Phase 8.

### Beat 2 — "The case opens" (scroll 40% → 70%)
- The headline block scales down slightly (`scale: 1 → 0.92`) and drifts up (`y: -6%`),
  opacity 1 → 0.9 — it recedes like a front page being set aside.
- Simultaneously, an ink stroke **draws the hero stick figure** center-left: the existing
  `StickFigure` art (pick the confident/walking pose) rendered as SVG with every path animated
  via stroke-dasharray/dashoffset, sequenced along the scrub (head → body → limbs). By 70% the
  figure is fully drawn and its idle breathing loop (from base Phase 2) takes over.
- Three short annotation labels write themselves next to the figure in the handwritten accent
  style (or JetBrains Mono italic if no handwritten font is loaded): "aptitude", "aspiration",
  "ability" — each with a tiny hand-drawn connector line that draws in. These are i18n strings.

### Beat 3 — "Handoff" (scroll 70% → 100%)
- The stacked 3D sheets tilt and slide off-canvas right with slight rotation (like being filed),
  fading out.
- The StopPress ticker and the "Your progress" strip (existing sections below the hero) are
  revealed as the pin releases — ensure the release is seamless: the last 5% of the timeline
  animates the hero container's bottom border (1px ink rule) drawing in, so the eye lands on a
  finished edge, then normal page scroll resumes with the base `useReveal` staggers.
- No content may jump at unpin. Verify by scrolling slowly across the boundary 10 times.

### Scroll-back behavior
Scrub means it reverses naturally — verify reverse plays clean (stroke draws un-draw, sheets
un-stack). No `once: true` inside the pinned timeline.

---

## DETAILS THAT SELL IT (do all of these)
- **Progress ink:** a 2px vertical ink line fixed at the left edge of the hero, filling
  top→bottom with scrub progress (scaleY) — a quiet "how far into the opening am I" cue.
- **Cursor:** inside the hero only, the cursor gains a small trailing ink dot
  (`gsap.quickTo` x/y, 0.25s lag). Removed outside the hero. Desktop only.
- **Sound (only if the app's sound setting is ON):** one soft paper-slide sample tied to Beat 1
  crossing 20% (fire once per direction, volume ≤ 0.15), and a faint pen-scratch loop while
  Beat 2's figure is actively drawing (gate by scroll velocity > 0). Use the existing sounds
  infrastructure; if none exists for these, skip sound entirely — do not add new audio files
  over 20KB each.
- **Headline language switch:** switching en/hi/te while inside the hero re-splits the headline
  masks and regenerates the sheet masthead texture without breaking the timeline (rebuild the
  affected tweens in a `useEffect` on language).

## WHAT NOT TO DO
- No color beyond ink/paper/one accent. No particles, no bloom, no lens flares, no gradients.
- No horizontal scroll hijack; vertical pin only.
- No layout/width/height/top/left tweens. Transforms and opacity only.
- Do not touch `StaticMasthead` beyond the pure extraction. Do not modify any other page.
- Do not exceed ~180KB gzipped for the hero chunk (three.js already split in base Phase 8 —
  reuse that chunk, don't duplicate three).

## ACCEPTANCE CHECK
1. Desktop ≥1024px: full sequence, smooth at 60fps on a mid laptop; reverse-scroll clean;
   unpin seamless; CTA clickable at 0s.
2. Mobile 375px: NO pin, NO three.js — `StaticMasthead` renders, page scrolls natively.
3. Reduced motion: `StaticMasthead`, zero animation.
4. Delete test: remove the `<ShowpieceHero/>` branch → Home identical to pre-addendum.
5. `npm run typecheck && npx vite build` green; Lighthouse mobile ≥ 85; CLS < 0.05 desktop.
6. Language switch inside hero: hi and te headlines mask-reveal correctly, no clipped glyphs
   (Devanagari/Telugu ascenders need `line-height ≥ 1.25` inside masks — set it).
7. New `data-testid`s: `showpiece-hero`, `hero-primary-cta`, `hero-scroll-cue`.
