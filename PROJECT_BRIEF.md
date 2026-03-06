# CareerCase — Project Brief for AI Agents

> **Read this first.** This document covers everything about what CareerCase is, how it works,
> its full feature set, tech stack, monetization model, and coding conventions. Read this before
> opening any source file.

---

## 1. What Is CareerCase?

CareerCase is a **mobile-first PWA (Progressive Web App)** that lets users explore any career in
depth using AI — simulations, day-in-the-life breakdowns, roadmaps, interview prep, comparisons —
before committing to that path. Think of it as "test driving" a career.

- **Live URL (old):** `https://career-sim.pages.dev` → renaming to `https://careercasehq.pages.dev`
- **Worker URL:** `https://careercaseai.kamalreddi2901.workers.dev`
- **Audience:** Indian students and early-career professionals (18–28)
- **Pricing:** INR (₹). Designed to be affordable for Indian market.
- **Language:** English
- **Brand voice:** Confident, sharp, slightly opinionated — not corporate-speak.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18.3.1 + TypeScript |
| Build tool | Vite 6.3.5 |
| Styling | Tailwind CSS v4 + CSS variables (theme in `src/styles/theme.css`) |
| UI components | shadcn/ui (located in `src/app/components/ui/`) |
| Routing | React Router v7 (`createBrowserRouter`) |
| Animation | Motion (Framer Motion v11) |
| Auth | Supabase (email + Google OAuth) |
| Database | Supabase (PostgreSQL) |
| AI | Groq API (models below) |
| AI proxy | Cloudflare Worker (`worker/`) |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Workers (AI proxy) |
| Analytics | PostHog (injected via snippet, no npm package) |
| Payments | Razorpay (placeholder — integration pending) |
| Notifications | Sonner (toast library) |
| Icons | Lucide React |
| Charts | Recharts |
| PDF Export | jsPDF + html2canvas |

---

## 3. Project Structure

```
/
├── index.html                        # Entry HTML, favicon, OG tags (all say "CareerCase")
├── public/
│   ├── logo.svg                      # SVG favicon: black circle, magnifier, CC monogram
│   └── manifest.json                 # PWA manifest: name = "CareerCase"
├── worker/                           # Cloudflare Worker (AI proxy — deployed separately)
│   ├── src/index.ts                  # Main worker handler
│   ├── src/models.ts                 # Model config + quota limits
│   ├── wrangler.toml                 # Worker name: "careercaseai"
│   └── package.json
├── src/
│   ├── main.tsx                      # React entry; PostHog snippet injection
│   └── app/
│       ├── App.tsx                   # Provider hierarchy (see Section 6)
│       ├── routes.ts                 # All routes (all pages lazy-loaded)
│       ├── components/
│       │   ├── Navbar.tsx            # Top nav; logo = "CareerCase"; History = "Case Archive"
│       │   ├── BottomNav.tsx         # Mobile bottom nav
│       │   ├── PaywallModal.tsx      # Quota hit modal (Pro plan + One-time Packs)
│       │   └── ui/                   # shadcn/ui components (don't edit these)
│       ├── context/
│       │   ├── AppContext.tsx        # Global job/dossier state; re-throws QuotaExceededError
│       │   ├── AuthContext.tsx       # Supabase auth state
│       │   ├── UsageContext.tsx      # Per-user quota tracking (mirrors worker limits)
│       │   └── PaywallContext.tsx    # Global paywall trigger: triggerPaywall(), withPaywall()
│       ├── hooks/
│       │   ├── useFavorites.ts
│       │   ├── usePaywall.ts         # Per-component paywall hook (alternative to context)
│       │   ├── usePreferences.ts
│       │   ├── useStreak.ts
│       │   └── useKeyboardShortcuts.ts
│       ├── pages/                    # One file per route (see Section 5)
│       ├── services/
│       │   ├── ai.ts                 # ALL AI calls live here (proxy-aware)
│       │   ├── supabase.ts           # Supabase client + DB helpers
│       │   └── interview.ts          # Interview prep helpers
│       └── utils/
│           ├── pdfExport.ts
│           ├── share.ts
│           ├── sounds.ts
│           ├── haptic.ts
│           └── markdown.ts
├── .env                              # Local dev env vars (NEVER commit real keys)
├── .env.local                        # Supabase URL + anon key (gitignored)
└── supabase-migration.sql            # All DB table definitions
```

---

## 4. Pages & Routes

| Route | Component | What it does |
|---|---|---|
| `/` | `HomePage` | Search bar, trending jobs, how-it-works, footer |
| `/auth` | `AuthPage` | Email + Google sign-in/sign-up |
| `/job` | `JobOverviewPage` | Job overview card after search (preliminary AI preview) |
| `/job/detail` | `JobDetailPage` | Full dossier — salary, skills, radar chart, simulation, chat, related careers, affiliate links |
| `/simulation` | `SimulationPage` | Day-in-the-life / week simulation with stick figures |
| `/history` | `HistoryPage` | **"Case Archive"** — saved dossiers; pinned ones shown as **"Pinned Cases"** |
| `/quiz` | `QuizPage` | Career personality quiz with AI result |
| `/compare` | `ComparisonPage` | Side-by-side comparison of 2 careers |
| `/favorites` | `FavoritesPage` | Saved/starred jobs |
| `/interview-prep` | `InterviewPrepPage` | AI-generated interview Q&A for a role |
| `/settings` | `SettingsPage` | Theme, sounds, haptics, data export, install PWA |
| `/mood` | `MoodMatchPage` | Match a career to current mood/energy |
| `/career-transition` | `CareerTransitionPage` | AI plan to transition from current → target career |
| `/roadmap` | `CareerRoadmapPage` | 3/6/12-month learning roadmap for a career |
| `/pricing` | `PricingPage` | Full pricing page: Free vs Pro, one-time packs, FAQ |

---

## 5. Feature Set

### 5.1 Core Features

**Career Dossier** (`/job/detail`)
- Full AI breakdown of any job: salary range, required skills, day-in-the-life, career growth,
  GBU (Good/Bad/Ugly), work-life balance score, related careers, affiliate learning links.
- Powered by `llama-3.3-70b-versatile` (premium tier).
- Exportable as PDF. Shareable via URL.

**Career Simulation** (`/simulation`)
- Interactive "day in the life" simulation — user makes choices, AI responds to each decision.
- Multiple timelines: single day, full week, month.
- Stick figure animations for immersion.
- Premium model.

**Career Comparison** (`/compare`)
- Head-to-head comparison of 2 careers across salary, skills, lifestyle, growth.
- Premium model.

**Career Transition Plan** (`/career-transition`)
- Given current role + target role, AI generates a realistic transition plan with milestones.

**Career Roadmap** (`/roadmap`)
- 3-month, 6-month, or 12-month structured learning roadmap for any career.

**AI Chat** (`/job/detail` — chat panel)
- Contextual Q&A chat within a dossier. User can ask follow-ups.
- Uses `streamChat()` with streaming SSE responses.

**Interview Prep** (`/interview-prep`)
- Role-specific interview questions + model answers.

**Career Quiz** (`/quiz`)
- Personality/interest quiz → AI career recommendations.
- **Not metered** (free for all users, no daily limit).

**Mood Match** (`/mood`)
- Match a career vibe to current mood/energy state.
- **Not metered**.

**Case Archive** (`/history`)
- Supabase-persisted history of all dossiers/simulations the user has generated.
- Pinning supported — pinned entries shown under "Pinned Cases".

**Favorites** (`/favorites`)
- Star any job/career for quick access later.

### 5.2 Supporting Features

- **PWA**: installable, offline-capable (service worker via vite-plugin-pwa)
- **Onboarding tour**: first-time user walkthrough (`OnboardingTour.tsx`)
- **Keyboard shortcuts**: `/` to focus search, etc. (`useKeyboardShortcuts.ts`)
- **PDF export**: full dossier → PDF via jsPDF
- **Share**: encode dossier state in URL for sharing
- **Streak tracking**: daily usage streak (`useStreak.ts`)
- **Theme**: light/dark/system via CSS variables
- **Sounds + haptics**: optional UI feedback (`sounds.ts`, `haptic.ts`)

---

## 6. Architecture — Provider Hierarchy

```tsx
<ErrorBoundary>
  <AuthProvider>           // Supabase session, user object
    <AppProvider>          // Job search state, dossier data, global toasts
      <UsageProvider>      // Daily quota counters, plan (free/pro)
        <PaywallProvider>  // Global paywall modal; triggerPaywall(), withPaywall()
          <RouterProvider> // React Router
```

All providers wrap the whole app so any page can access any context.

---

## 7. AI Service (`src/app/services/ai.ts`)

### 7.1 Proxy vs Direct

```
VITE_AI_PROXY_URL is set (production)  →  all requests → Cloudflare Worker
VITE_AI_PROXY_URL is empty (dev)       →  direct Groq API using VITE_GROQ_API_KEYS
```

**In production, `VITE_GROQ_API_KEYS` must NOT be set.** Keys live only as Cloudflare Worker secrets.

### 7.2 Key Functions

| Function | Description |
|---|---|
| `callGroq(messages, options)` | Non-streaming single response |
| `callGroqStreaming(messages, options)` | Streaming via SSE |
| `streamChat(messages, options)` | Async generator for chat streaming |
| `generateJobDossier(job)` | Full dossier — `usageType: 'dossier'` |
| `generateSimulation(job, choice)` | Simulation response — `usageType: 'simulation'` |
| `getRelatedCareers(job)` | Related career suggestions — `usageType: 'related'` |
| `getGoodBadUgly(job)` | GBU analysis — `usageType: 'gbu'` |
| `getWorkLifeBalance(job)` | WLB score + breakdown — `usageType: 'wlb'` |
| `getLearnMoreResources(job)` | Learning resources list — `usageType: 'related'` |
| `generateQuizResult(answers)` | Quiz analysis — `usageType: 'quiz'` |
| `generateCareerTransition(from, to)` | Transition plan — `usageType: 'transition'` |
| `generateCareerRoadmap(job, duration)` | Roadmap — `usageType: 'roadmap'` |
| `generateComparison(job1, job2)` | Comparison — `usageType: 'compare'` |
| `generateInterviewQuestions(job)` | Interview Q&A — `usageType: 'interview'` |

### 7.3 `usageType` Values and What They Mean

Every AI call passes a `usageType` header to the Worker, which decides model tier and quota column.

| usageType | Model tier | Quota column | Notes |
|---|---|---|---|
| `dossier` | premium (70B) | `dossiers_used` | Main dossier generation |
| `simulation` | premium (70B) | `simulations_used` | Day-in-life simulation |
| `chat` | premium (70B) | `ai_chats_used` | In-dossier chat |
| `compare` | premium (70B) | `compares_used` | Career comparison |
| `transition` | premium (70B) | `transitions_used` | Career transition plan |
| `roadmap` | premium (70B) | `roadmaps_used` | Career roadmap |
| `interview` | premium (70B) | none (unmetered) | Interview prep |
| `gbu` | premium (70B) | none (unmetered) | Good/Bad/Ugly |
| `suggestion` | standard (8B) | none (unmetered) | Autocomplete suggestions |
| `trending` | standard (8B) | none (unmetered) | Trending jobs |
| `preliminary` | standard (8B) | none (unmetered) | Job overview preview |
| `related` | standard (8B) | none (unmetered) | Related careers list |
| `wlb` | standard (8B) | none (unmetered) | Work-life balance |
| `quiz` | standard (8B) | none (unmetered) | Quiz results |
| `mood` | standard (8B) | none (unmetered) | Mood match |
| `refine` | standard (8B) | none (unmetered) | Content refinement |

### 7.4 QuotaExceededError

When the Worker returns HTTP 402, `ai.ts` throws `QuotaExceededError`:

```ts
export class QuotaExceededError extends Error {
  detail: { used: number; limit: number; plan: string; quotaColumn: string }
}
```

Every page that calls a metered AI function wraps it in try/catch and calls:
```ts
if (err instanceof QuotaExceededError) {
  triggerPaywall('featureName', err.detail);
  return;
}
```

---

## 8. Cloudflare Worker (`worker/`)

Deployed at: `https://careercaseai.<subdomain>.workers.dev`

### What It Does (in order per request)
1. Handles CORS preflight
2. Parses the `Authorization: Bearer <supabase_jwt>` header — decodes JWT to get `user_id`
3. Looks up the user's plan (`user_profiles` table) — defaults to `'free'`
4. Checks today's usage against the limit (`user_usage` table)
5. If over limit → returns `HTTP 402` with JSON: `{ error, code: 'QUOTA_EXCEEDED', detail }`
6. If within limit → increments the usage counter (upsert with `on_conflict`)
7. Picks a Groq model based on `X-Usage-Type` header (using `USAGE_MODEL_TIER` map)
8. Rotates through `GROQ_API_KEYS` (comma-separated secret), skipping rate-limited keys
9. Proxies request to Groq, streams SSE back to browser

### Worker Secrets (set via `npx wrangler secret put`)
| Secret | Value |
|---|---|
| `GROQ_API_KEYS` | Comma-separated Groq API keys (no spaces) |
| `SUPABASE_URL` | `https://mmwgnsggnllwgshipnwh.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role key from Supabase dashboard |

### Allowed CORS Origins
```
https://career-sim.pages.dev
https://careercasehq.pages.dev
http://localhost:5173
http://localhost:5174
```
If you add a new domain, update the `cors()` function in `worker/src/index.ts`.

### Changing Models
Edit `worker/src/models.ts` — the `MODELS` object. No other file needs changing:
```ts
export const MODELS = {
  premium: 'llama-3.3-70b-versatile',  // used for dossiers, sims, chat, etc.
  standard: 'llama-3.1-8b-instant',    // used for previews, suggestions, etc.
}
```

---

## 9. Database Schema (Supabase)

Full definitions in `supabase-migration.sql`.

### Key Tables

**`career_history`** — AI-generated dossiers/simulations saved per user
```
id, user_id, job_title, content (jsonb), type, is_pinned, created_at
```

**`user_profiles`** — Subscription plan per user
```
user_id (FK → auth.users), plan ('free'|'pro'), plan_expires_at, credits_remaining, created_at
```

**`user_usage`** — Daily usage counters (resets each UTC day)
```
user_id, date (YYYY-MM-DD), dossiers_used, simulations_used, ai_chats_used,
compares_used, transitions_used, roadmaps_used
```
Primary key: `(user_id, date)` — upserted on each AI call.

**`payments`** — Razorpay transaction log
```
id, user_id, razorpay_order_id, razorpay_payment_id, amount, currency, plan_type,
pack_id, status, created_at
```

---

## 10. Monetization Model

### 10.1 Plans

**Free Tier** (permanent — no trial expiry, no credit card required)
| Feature | Daily Limit |
|---|---|
| Career Dossiers | 3/day |
| Simulations | 1/day |
| AI Chat messages | 5/day |
| Career Comparisons | 1/day |
| Career Transitions | 1/day |
| Career Roadmaps | 1/day |
| Quiz, Mood Match, Interview Prep | Unlimited |

**Pro Plan** — ₹59/month (early bird; original ₹149/month)
| Feature | Daily Limit |
|---|---|
| Career Dossiers | 15/day |
| Simulations | 5/day |
| AI Chat messages | 50/day |
| Career Comparisons | 5/day |
| Career Transitions | 5/day |
| Career Roadmaps | 5/day |
| PDF Export | ✓ |
| Priority support | ✓ |

**One-Time Credit Packs** (credits never expire)
| Pack | Price | Original Price | Tag |
|---|---|---|---|
| 5 Credits | ₹29 | ₹49 | Starter |
| 20 Credits | ₹99 | ₹199 | Most Popular |
| 50 Credits | ₹199 | ₹499 | Best Value |

1 credit = 1 premium AI call (dossier, simulation, transition, etc.)
Chat: 1 credit = 5 messages.

### 10.2 Quota Enforcement Flow

```
User clicks feature → ai.ts sends request to Worker with JWT + X-Usage-Type header
→ Worker checks user_usage table
  → Over limit: HTTP 402 → QuotaExceededError thrown in ai.ts
    → Page catches it → calls triggerPaywall('featureName', { used, limit, plan })
    → PaywallModal opens (Pro tab or Pack tab)
  → Under limit: Worker increments counter → proceeds with Groq call
```

Quotas reset daily at midnight UTC (based on `YYYY-MM-DD` date key in `user_usage`).

### 10.3 Paywall UI

**`PaywallModal`** (`src/app/components/PaywallModal.tsx`)
- Triggers automatically on any QuotaExceededError via `PaywallContext`
- Two tabs: **Pro Plan** and **One-time Packs**
- Shows `featureName` + `used / limit` context
- "Why paid?" expandable section
- `handleRazorpay()` is a placeholder `alert()` — **Razorpay integration pending**
- `PLANS.pro.razorpayPlanId` = empty string — fill in after Razorpay setup

**`PricingPage`** (`/pricing`)
- Standalone pricing page accessible from Navbar/BottomNav
- Same Free vs Pro grid + all 3 pack cards + FAQ accordion
- `handleRazorpay()` is also a placeholder here

### 10.4 Razorpay Integration (TODO)
When Razorpay account is approved:
1. Get Key ID from Razorpay dashboard
2. Create plan in Razorpay for recurring ₹59/month subscription
3. Update `PLANS.pro.razorpayPlanId` in `PaywallModal.tsx`
4. Replace `handleRazorpay()` in both `PaywallModal.tsx` and `PricingPage.tsx` with actual
   Razorpay Checkout script call
5. Add Razorpay webhook secret to Cloudflare Worker secrets to verify payments server-side
6. Worker should update `user_profiles.plan = 'pro'` and `plan_expires_at` on successful payment

---

## 11. Environment Variables

### Frontend (Cloudflare Pages / `.env`)
| Variable | Dev value | Production value |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://mmwgnsggnllwgshipnwh.supabase.co` | same |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (in `.env.local`) | same |
| `VITE_AI_PROXY_URL` | _(empty — uses direct Groq)_ | `https://careercaseai.kamalreddi2901.workers.dev` |
| `VITE_GROQ_API_KEYS` | 10 comma-separated keys | _(must be empty/unset in production)_ |
| `VITE_POSTHOG_KEY` | _(empty — analytics off)_ | `phc_xxxxx` |

### Cloudflare Worker Secrets
| Secret | Description |
|---|---|
| `GROQ_API_KEYS` | 10 Groq API keys, comma-separated ✅ set |
| `SUPABASE_URL` | Supabase project URL ✅ set |
| `SUPABASE_SERVICE_KEY` | service_role key _(pending)_ |

---

## 12. Navigation Structure

### Desktop Navbar (`src/app/components/Navbar.tsx`)
The `navLinks` array defines every desktop nav item. To add/remove/rename links, edit this array:
```ts
const navLinks = [
  { to: '/', icon: <Home size={14} />, label: 'Home' },
  { to: '/quiz', icon: <FlaskConical size={14} />, label: 'Quiz' },
  { to: '/mood', icon: <Brain size={14} />, label: 'Mood' },
  { to: '/career-transition', icon: <ArrowLeftRight size={14} />, label: 'Transition' },
  { to: '/roadmap', icon: <Map size={14} />, label: 'Roadmap' },
  { to: '/compare', icon: <Scale size={14} />, label: 'Compare' },
  { to: '/history', icon: <Clock size={14} />, label: 'Case Archive (n)' },
  { to: '/settings', icon: <Settings size={14} />, label: 'Settings' },
];
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
| `autoLoadTrending` | `true` | Auto-fetch trending careers on homepage load |

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

4. **Do not modify files in `src/app/components/ui/`** — those are shadcn/ui primitives.
   Create new components in `src/app/components/` instead.

5. **FREE_LIMITS in `UsageContext.tsx` must always mirror `FREE_DAILY_LIMITS` in `worker/src/models.ts`** — they are separate copies for frontend vs backend use. Change both together.

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

*Last updated: March 2026. Sections: Tech Stack, Pages, Features, Architecture, AI Service, Worker, Database, Monetization, Env Vars, Navigation, Theme, Data Files, Auth, Caching, Preferences, Build, Branding, Analytics, Affiliates, Conventions, Deployment. Keep this file current when making significant changes.*
