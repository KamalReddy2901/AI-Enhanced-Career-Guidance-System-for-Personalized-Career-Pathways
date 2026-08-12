# CareerCase — Current Handoff

CareerCase is a mobile-first PWA for exploring careers with AI dossiers, simulations, comparisons, transition plans, roadmaps, interview prep, quiz, mood matching, favorites, and history.

## Current architecture

- Frontend: React 18 + TypeScript + Vite + Tailwind
- Auth/data: Supabase
- AI proxy: Cloudflare Worker with Groq key rotation only
- Billing: removed. No credits, no subscriptions, no paywall, no payments
- Routes: all feature pages remain, including `/pricing` as a neutral access/info page

## What matters for future edits

- AI requests are routed through `src/app/services/ai.ts`
- The worker in `worker/src/index.ts` only proxies AI calls and rotates keys
- UI should stay free-first and never reintroduce a balance or purchase flow
- If a file mentions credits/paywalls historically, treat it as legacy text unless it is in a current feature description

## Relevant files

- [src/app/services/ai.ts](src/app/services/ai.ts)
- [worker/src/index.ts](worker/src/index.ts)
- [src/app/pages/PricingPage.tsx](src/app/pages/PricingPage.tsx)
- [src/app/pages/JobDetailPage.tsx](src/app/pages/JobDetailPage.tsx)

  { to: '/history', label: 'Archive (n)' },
  { to: '/settings', label: 'Settings' },
];
// Logged-in: credits badge (⚡N) → /pricing
// Logged-out: plain "Pricing" text link → /pricing (replaces badge)
```
The navbar **hides entirely on `/auth`** (no nav shown on login page).
Logo: `StickFigure` + "Career**Case**" — "Career" full opacity, "Case" at 35% opacity.
Logo click on `/`: smooth scrolls to top instead of navigating.

### Mobile Bottom Nav (`src/app/components/BottomNav.tsx`)
Separate, simpler list — only 5 items (screen space limited). Edit `NAV_ITEMS`:
```ts
const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/quiz', icon: Brain, label: 'Quiz' },
  { path: '/history', icon: Clock, label: 'History' },
  { path: '/compare', icon: FlaskConical, label: 'Compare' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];
```
Auto-hides on scroll down, reappears on scroll up. Hidden on `sm:` breakpoint and above (desktop uses Navbar instead). Hidden on print.

---

## 13. Theme & Visual Design

### Colors (`src/styles/theme.css`)
All colors are CSS variables — change here, everything updates. Key variables:

| Variable | Light value | Purpose |
|---|---|---|
| `--background` | `#f9f8f7` | Page background (warm off-white / newsprint) |
| `--foreground` | `oklch(0.145 0 0)` | Default text (near-black) |
| `--card` | `#f5f4f2` | Card/panel backgrounds |
| `--primary` | `#030213` | Primary buttons, links, accents |
| `--primary-foreground` | white | Text on primary buttons |
| `--muted` | `#ececf0` | Muted backgrounds |
| `--muted-foreground` | `#717182` | Placeholder/secondary text |
| `--accent` | `#e9ebef` | Hover states |
| `--border` | `rgba(0,0,0,0.1)` | All borders |
| `--destructive` | `#d4183d` | Error/delete actions |
| `--radius` | `0.625rem` | Base border radius (controls all rounded-* sizes) |

Dark mode variables follow the same names inside a `.dark {}` block in the same file.
To change the color scheme: edit these 10 variables + their dark counterparts.

### Background Texture
The body has a **newsprint/crumpled paper texture** built entirely from CSS SVG filters + layered gradients — no image file. It's in the `body {}` block in `theme.css`. To remove it, delete the `background-image:` declaration and keep only `background-color: var(--background)`.

### Typography (`src/styles/fonts.css`)
Three fonts loaded from Google Fonts:
| Font | Usage | Apply with |
|---|---|---|
| **Playfair Display** | Headings, logo, titles | `font-[Playfair_Display]` (Tailwind) or `font-family: 'Playfair Display'` |
| **Inter** | All body text, UI labels | Default body font (applied on `body` in theme.css) |
| **JetBrains Mono** | Code snippets, data values | `font-[JetBrains_Mono]` |

To swap fonts: update the Google Fonts `@import` in `fonts.css` and the `font-family` in `theme.css`.

### Border Radius
All UI roundness flows from `--radius: 0.625rem` in `theme.css`. Change this one value to go sharper (closer to 0) or more rounded (try `1rem`).

---

## 14. Static Data Files

### Job Titles (`src/app/data/jobs.ts`)
`JOB_TITLES` is a flat string array of ~200+ career titles used for:
- Search autocomplete suggestions
- "Trending" section seeding
- Quiz result recommendations

**To add a new career to the app:** just add the title string to `JOB_TITLES`. The AI generates all content dynamically — no other data needed. Job data (`JobData` interface) is always AI-generated; static data is only used as a fallback skeleton.

`JobData` interface fields:
```ts
{
  id, title, category, shortDescription, fullDescription,
  avgSalary, education[], skills[], dailyRoutine, workEnvironment,
  careerPath, weekOverview, quarterOverview, yearOverview, funFact,
  topCompanies?: TopCompany[],  // optional
  relevantForCompanies?: boolean
}
```

### Simulation Templates (`src/app/data/simulations.ts`)
Pre-written simulation scenarios used as fallback when AI simulation is unavailable.
Categories: `healthcare`, `tech`, `law`, `culinary`, `education`, `executive`, `default`.

Each scenario has: `time`, `title`, `description`, `stickFigurePose`, `choices[]`, `correctChoiceIndex`, `explanation`.

`{job}` in any text field is replaced with the actual job title at runtime.

To add a new simulation category:
1. Add a new key to `SIMULATION_TEMPLATES` with scenario array
2. Add keyword detection in `getSimCategory()` function

Available `stickFigurePose` values: `waking`, `walking`, `sitting`, `presenting`, `thinking`, `working`, `talking`, `eating`, `celebrating`, `tired`, `running`, `reading`

---

## 15. Authentication & Landing Page Logic

**How the homepage decides what to show:**
```ts
const showLanding = isSupabaseConfigured && !user;
// true  → show marketing landing page (for logged-out visitors)
// false → show search interface (logged-in users, or Supabase not configured)
```
The landing page includes a **"The questions CareerCase answers"** section (8 use-case cards,
showing only when `showLanding = true`) between "How CareerCase Works" and "What You Get".

Feature pages (Quiz, Mood Match, Career Transition, Career Roadmap, Compare) gate their UI
behind auth: logged-out visitors see a centred teaser card with a "Get Started — It's Free"
CTA instead of the full feature UI.

If Supabase is not configured (`VITE_SUPABASE_URL` not set), the app skips auth entirely and goes straight to search — useful for dev without Supabase.

**Auth methods:** Email (magic link or password) + Google OAuth — both via Supabase.
**Auth page** (`/auth`) is hidden from Navbar — no back button, clean focused UI.
After sign-in, Supabase session is persisted in `localStorage` automatically.

---

## 16. Caching

AI responses are cached in `localStorage` for **24 hours**:
```ts
const CACHE_PREFIX = 'careersim_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
```
Cache key = `CACHE_PREFIX + jobTitle.toLowerCase()`.
This means the same dossier search within 24h costs 0 AI calls — no quota consumed.

To change cache duration: edit `CACHE_EXPIRY` in `src/app/services/ai.ts`.
To disable caching: pass `skipCache: true` to `searchJobAI()`.
To clear all cache: call `clearAICache()` from `useApp()` context, or user can clear from Settings page.

**Trending cache (Supabase):** `getTrendingCareers()` uses a two-level cache:
1. `localStorage` key `trending_careers_YYYY-MM-DD` — avoids Supabase read on same-session revisit
2. `trending_cache` Supabase table — shared across all users; first visitor of the day triggers the
   AI call (`usageType: 'trending'`, free), result is upserted into Supabase, all subsequent
   visitors read the row with no AI call.

---

## 17. User Preferences (`src/app/hooks/usePreferences.ts`)

All preferences are stored in `localStorage` under key `careersim_preferences`. Defaults:

| Preference key | Default | What it does |
|---|---|---|
| `soundEffects` | `false` | Enable/disable all sound effects |
| `showOnboarding` | `true` | Show first-time tour on next visit |
| `defaultView` | `'week'` | Default timeline in dossier: `'week'`, `'quarter'`, `'year'` |
| `compactMode` | `false` | Compact layout (tighter spacing) |
| `autoSaveNotes` | `true` | Auto-save user notes |
| `currency` | `'INR'` | Salary display format: `'INR'` or `'USD'` |
| `showRelatedCareers` | `true` | Show "Related Careers" section in dossier |
| `defaultDossierTab` | `'timeline'` | Which tab opens first: `'wlb'`, `'learn'`, `'timeline'` |
| `roadmapDetailLevel` | `'detailed'` | Roadmap verbosity: `'essential'`, `'detailed'`, `'comprehensive'` |

> **Note:** `autoLoadTrending` has been removed. Trending careers now auto-load via
> IntersectionObserver when the section scrolls into view, using the shared Supabase daily cache.
> Users cannot manually refresh the list.

To change a default for all new users: edit `DEFAULT_PREFERENCES` in `usePreferences.ts`.
To add a new preference: add it to the `UserPreferences` interface + `DEFAULT_PREFERENCES` + expose it in `SettingsPage.tsx`.

---

## 18. Build & Dev Commands

```bash
# Run dev server (http://localhost:5173)
npm run dev

# Production build → outputs to dist/
npm run build

# Deploy worker (run from worker/ dir, separate from frontend)
cd worker && npx wrangler deploy

# Set a worker secret
cd worker && npx wrangler secret put SECRET_NAME

# Add new shadcn/ui component
npx shadcn@latest add <component-name>
```

**Path alias:** `@` maps to `src/` — use `@/app/components/...` in imports.

**Build output:** `vite build` creates `dist/`. Cloudflare Pages deploys from this automatically on every push to `main`.

**PWA:** The service worker is auto-generated by `vite-plugin-pwa`. It caches all JS/CSS/HTML/SVG/fonts and serves offline. Clearbit company logos are cached separately (CacheFirst, 7 days, max 80 entries).

**Chunk splitting:** `jspdf` + `html2canvas` are split into a `pdf-vendor` chunk so they only load when PDF export is used.

---

## 19. Branding & Terminology

| Old / Generic | CareerCase term |
|---|---|
| App name | **CareerCase** |
| Saved dossier | **CaseFile** |
| History page | **Case Archive** |
| Pinned dossiers | **Pinned Cases** |

**Never show in UI:**
- "Powered by Groq", "Groq", "Llama", any model names
- "AI model", specific model version strings

**Tone:** Sharp, direct, confident — like a smart older friend who's been in the industry.
Avoid corporate language. Avoid exclamation marks everywhere.

---

## 20. Analytics

PostHog is injected conditionally in `src/main.tsx`:
```ts
if (import.meta.env.VITE_POSTHOG_KEY) {
  // injects posthog-js snippet dynamically
}
```
No npm package — loaded from CDN only in production.
Set `VITE_POSTHOG_KEY=phc_xxxxx` in Cloudflare Pages env vars to activate.

---

## 21. Affiliate Links

Located in `JobDetailPage.tsx` in the "Level Up" section (rendered between Related Careers
and action buttons).

Links are category-mapped:
| Category | Platform | Link |
|---|---|---|
| Tech / Engineering | Scaler, Coursera | Hard-coded `utm_source=careercase` URLs |
| Business / Finance | Coursera | Same pattern |
| Design | Coursera, Udemy | Same pattern |
| Default (any) | Coursera, Internshala | Same pattern |

All links use `rel="noopener noreferrer sponsored"` and open in new tab.
Add `utm_source=careercase` to any affiliate URL for tracking.

---

## 22. Important Coding Conventions

1. **All pages are lazy-loaded** via `React.lazy()` in `routes.ts`. Exports must be named (not default) from the page file, e.g., `export function JobDetailPage()`.

2. **Never add default exports to page components** — routes use named exports.

3. **QuotaExceededError pattern** — any page calling a metered AI function must:
   ```ts
   import { QuotaExceededError } from '../services/ai';
   import { usePaywallContext } from '../context/PaywallContext';
   const { triggerPaywall } = usePaywallContext();
   // in catch block:
   if (err instanceof QuotaExceededError) { triggerPaywall('featureName', err.detail); return; }
   ```
   Ask AI and PDF Export are available to all users — no Pro gate. Ask AI costs 1 credit/message
   (or is free during an active Ask AI perk). PDF Export is always free.

4. **Do not modify files in `src/app/components/ui/`** — those are shadcn/ui primitives.
   Create new components in `src/app/components/` instead.

5. **CREDIT_COSTS in `UsageContext.tsx` must always mirror `CREDIT_COSTS` in `worker/src/models.ts`** — they are separate copies for frontend vs backend use. Change both together.

6. **TypeScript generic arrow functions in `.tsx` files** — use trailing comma to avoid JSX parse errors:
   ```ts
   // WRONG in .tsx:      const fn = <T>(x: T) => x
   // CORRECT in .tsx:    const fn = <T,>(x: T) => x
   ```

7. **Tailwind v4** is used — class syntax is standard but config is in `postcss.config.mjs`
   and `src/styles/tailwind.css`. No `tailwind.config.js`.

8. **CSS theme variables** are in `src/styles/theme.css`. Color scheme uses HSL values.
   Light/dark mode is driven by the `.dark` class on `<html>`.

---

## 23. Deployment Checklist

### First-time Setup
- [ ] Run `supabase-migration.sql` in Supabase SQL Editor (all tables)
- [ ] Set `SUPABASE_SERVICE_KEY` Worker secret: `npx wrangler secret put SUPABASE_SERVICE_KEY`
- [ ] Deploy Worker: `cd worker && npx wrangler deploy`
- [ ] In Cloudflare Pages dashboard → Environment Variables:
  - Add `VITE_AI_PROXY_URL` = Worker URL
  - Remove `VITE_GROQ_API_KEYS` (must not be in bundle)
  - Add `VITE_POSTHOG_KEY` = PostHog key (when ready)
- [ ] Trigger a redeploy

### Routine Deploys
- Push to `main` branch → Cloudflare Pages auto-deploys
- Worker changes: `cd worker && npx wrangler deploy` (separate from frontend)

---

*Last updated: March 2026. Recent changes: credits-only monetisation (Pro plan removed), Razorpay credit pack payments live (30/75/120 credits; 7/15/30-day Ask AI perk bundled per pack), Ask AI now credit-based for all users (1 credit/message; free during perk; 50/day cap enforced by Worker → ChatDailyCapError), PDF Export free for all users, PaywallModal shows only packs (no Pro tab), PricingPage rewritten (no Pro grid), DB schema updated (plan/pro columns dropped; ask_ai_unlimited_until + ask_ai_daily_used added), feature page pre-auth teasers (Quiz/Mood/Transition/Roadmap/Compare), landing page use-case cards section, MagnifierSearch typewriter placeholder animation, OnboardingTour auth-gated (post-login only; TOUR_KEY = careersim_onboarded_v2), SettingsPage Reset Onboarding fixed (correct key + same-tab dispatchEvent), Navbar pre-auth cleanup (Archive/Settings hidden; Pricing link shown; AI-on badge removed), brand consistency pass (careercase.pages.dev canonical; CareerCase throughout PDF/OnboardingTour/InstallPrompt). Sections: Tech Stack, Pages, Features, Architecture, AI Service, Worker, Database, Monetization, Env Vars, Navigation, Theme, Data Files, Auth, Caching, Preferences, Build, Branding, Analytics, Affiliates, Conventions, Deployment. Keep this file current when making significant changes.*
