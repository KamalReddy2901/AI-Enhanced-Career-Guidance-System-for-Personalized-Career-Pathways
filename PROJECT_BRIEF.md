# CareerCase — Project Brief for AI Agents

> **Read this first.** This document covers everything about what CareerCase is, how it works,
> its full feature set, tech stack, monetization model, and coding conventions. Read this before
> opening any source file.

---

## 1. What Is CareerCase?

CareerCase is a **mobile-first PWA (Progressive Web App)** that lets users explore any career in
depth using AI — simulations, day-in-the-life breakdowns, roadmaps, interview prep, comparisons —
before committing to that path. Think of it as "test driving" a career.

- **Live URL:** `https://careercase.pages.dev` (Cloudflare Pages; `careercase.kamrede.page` also points here as a custom domain)
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
| Payments | Razorpay (live — credit pack purchases) |
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
│   ├── src/models.ts                 # Model config + credit costs
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
│       │   ├── PaywallModal.tsx      # Credits exhausted modal (credit packs only, no Pro tab)
│       │   └── ui/                   # shadcn/ui components (don't edit these)
│       ├── context/
│       │   ├── AppContext.tsx        # Global job/dossier state; re-throws QuotaExceededError
│       │   ├── AuthContext.tsx       # Supabase auth state
│       │   ├── UsageContext.tsx      # Credits balance, hasUnlimitedAskai, CREDIT_COSTS
│       │   └── PaywallContext.tsx    # Global paywall trigger: triggerPaywall()
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
- Before the full comparison, both career slots auto-fill a short context description
  (`getQuickDescription()`) — user can edit it before triggering the ⚡2 comparison.
- AI insight (`getComparisonInsight()`) appears at the top of the results.
- Premium model.

**Career Transition Plan** (`/career-transition`)
- Given current role + target role, AI generates a realistic transition plan with milestones.
- From/To descriptions auto-fill as quick context (`getQuickDescription()`) and can be
  edited by the user before running the ⚡2 transition plan.

**Career Roadmap** (`/roadmap`)
- 3-month, 6-month, or 12-month structured learning roadmap for any career.
- An optional context description auto-fills when the career field loses focus; the user
  can edit it before requesting the ⚡2 roadmap.

- **Ask AI** (`/job/detail` — chat panel, and on Compare/Roadmap/Transition pages)
- Contextual Q&A chat within any AI-generated page. User can ask follow-ups.
- Uses `streamChat()` with streaming SSE responses.
- Costs **1 credit per message**. During an active Ask AI perk (from a credit pack purchase),
  messages are free — up to 50 per day. `hasUnlimitedAskai` from `UsageContext` controls UI hints.
- `ChatDailyCapError` is thrown when the daily cap is hit; pages show a "servers busy" toast.
- The floating Ask AI button always opens the panel. The panel shows current cost/perk status.

**Interview Prep** (`/interview-prep`)
- Role-specific interview questions + model answers.

**Career Quiz** (`/quiz`)
- Personality/interest quiz → AI career recommendations.
- **Free** (costs 0 credits).

**Mood Match** (`/mood`)
- Match a career vibe to current mood/energy state.
- **Free** (costs 0 credits).

**Case Archive** (`/history`)
- Supabase-persisted history of all dossiers/simulations the user has generated.
- Pinning supported — pinned entries shown under "Pinned Cases".

**Favorites** (`/favorites`)
- Star any job/career for quick access later.

### 5.2 Supporting Features

- **PWA**: installable, offline-capable (service worker via vite-plugin-pwa)
- **Pre-auth teasers**: Quiz, Mood Match, Career Transition, Career Roadmap, and Career Comparison
  pages show a centred teaser (feature name, description, "Get Started — It's Free" CTA) to
  logged-out visitors instead of the full feature UI.
- **Onboarding tour**: first-time logged-in user walkthrough (`OnboardingTour.tsx`). Only shown
  after sign-in, not pre-auth. TOUR_KEY = `careersim_onboarded_v2`.
- **Keyboard shortcuts**: `/` to focus search, etc. (`useKeyboardShortcuts.ts`)
- **PDF export**: full dossier → PDF via jsPDF (**free for all logged-in users**)
- **Share**: encode dossier state in URL for sharing
- **Streak tracking**: daily usage streak (`useStreak.ts`)
- **Theme**: light/dark/system via CSS variables
- **Sounds + haptics**: optional UI feedback (`sounds.ts`, `haptic.ts`)
- **Shared trending cache**: trending careers are generated by AI **once per day** and stored
  in `trending_cache` (Supabase). Every visitor reads the same cached list — no per-user AI
  calls. The list auto-loads via IntersectionObserver when the section scrolls into view.
  Users cannot manually refresh it.
- **Search bar typewriter animation**: `MagnifierSearch` cycles through 10 career title suggestions
  as a typewriter placeholder when the input is idle; clears on focus or when the user types.
- **Landing use case cards**: A "The questions CareerCase answers" section on the homepage
  (visible only pre-auth) shows 8 concrete question cards with hints about which tool answers each.

---

## 6. Architecture — Provider Hierarchy

```tsx
<ErrorBoundary>
  <AuthProvider>           // Supabase session, user object
    <AppProvider>          // Job search state, dossier data, global toasts
      <UsageProvider>      // Credits balance, plan (free/pro)
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
| `generateCareerTransition(from, to, fromDesc?, toDesc?)` | Transition plan with optional context descriptions — `usageType: 'transition'` |
| `generateCareerRoadmap(job, duration, description?)` | Roadmap with optional context — `usageType: 'roadmap'` |
| `generateComparison(job1, job2)` | Comparison — `usageType: 'compare'` |
| `getComparisonInsight(job1, job2, desc1, desc2)` | AI narrative insight at compare results top — `usageType: 'compare'` (shares credit charge) |
| `getQuickDescription(jobTitle)` | Short auto-fill description for context textareas — `usageType: 'preliminary'` (free) |
| `generateInterviewQuestions(job)` | Interview Q&A — `usageType: 'interview'` |
| `getTrendingCareers()` | Shared daily trending list — checks Supabase cache first, calls AI only if no row for today |

### 7.3 `usageType` Values and What They Mean

Every AI call passes a `usageType` header to the Worker, which decides model tier and credit cost.

| usageType | Model tier | Credit cost | Notes |
|---|---|---|---|
| `dossier` | premium (70B) | 3 | Main dossier generation |
| `simulation` | premium (70B) | 5 | Full session: 10 scenarios + final assessment |
| `chat` | premium (70B) | 1 | In-dossier chat (costs 1 credit; free during Ask AI perk) |
| `compare` | premium (70B) | 2 | Career comparison |
| `transition` | premium (70B) | 2 | Career transition plan |
| `roadmap` | premium (70B) | 2 | Career roadmap |
| `interview` | premium (70B) | 1 | Interview prep |
| `gbu` | premium (70B) | 0 | Included in dossier — not charged separately |
| `suggestion` | standard (8B) | 0 | Autocomplete suggestions |
| `trending` | standard (8B) | 0 | Trending jobs |
| `preliminary` | standard (8B) | 0 | Job overview preview |
| `related` | standard (8B) | 0 | Related careers list |
| `wlb` | standard (8B) | 0 | Work-life balance |
| `quiz` | standard (8B) | 0 | Quiz results |
| `mood` | standard (8B) | 0 | Mood match |
| `refine` | standard (8B) | 0 | Content refinement |

### 7.4 Error-handling Pattern

Every page that calls a credit-costing AI function wraps it in try/catch:
```ts
if (err instanceof QuotaExceededError) { triggerPaywall('featureName', err.detail); return; }
if (err instanceof ChatDailyCapError) { /* show "daily cap" toast — no paywall */ return; }
```

---

## 8. Cloudflare Worker (`worker/`)

Deployed at: `https://careercaseai.<subdomain>.workers.dev`

### What It Does (in order per request)
1. Handles CORS preflight
2. Parses the `Authorization: Bearer <supabase_jwt>` header — decodes JWT to get `user_id`
3. Looks up the user's profile (`user_profiles` table) — creates with 20 free credits if missing.
   **If the Supabase lookup fails, the worker throws a 503** (no silent credit bypass).
4. Determines credit cost for the `X-Usage-Type` (from `CREDIT_COSTS` map)
5. If `usageType` is `chat` and user has an active Ask AI perk (`ask_ai_unlimited_until` > now):
   - Checks/resets daily counter (`ask_ai_daily_used`, `ask_ai_daily_reset`)
   - Daily cap hit (50) → HTTP 402 `{ code: 'CHAT_DAILY_CAP' }` → `ChatDailyCapError` toast
   - Under cap → increments `ask_ai_daily_used` → proceeds for free
6. Otherwise, if insufficient `credits_remaining` → HTTP 402 `{ code: 'QUOTA_EXCEEDED', detail: { creditsRemaining, creditCost } }`
7. If enough credits → deducts from `credits_remaining` (atomic decrement)
8. Picks a Groq model based on `X-Usage-Type` header (using `USAGE_MODEL_TIER` map)
9. Rotates through `GROQ_API_KEYS` (comma-separated secret), skipping rate-limited keys
10. Proxies request to Groq, streams SSE back to browser

### Worker Secrets (set via `npx wrangler secret put`)
| Secret | Value |
|---|---|
| `GROQ_API_KEYS` | Comma-separated Groq API keys (no spaces) |
| `SUPABASE_URL` | `https://mmwgnsggnllwgshipnwh.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role key from Supabase dashboard |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key (server-side signing) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification secret |

### Allowed CORS Origins
```
https://career-sim.pages.dev
https://careercasehq.pages.dev
https://careercase.pages.dev
https://careercase.kamrede.page
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

**`user_profiles`** — Credits balance and Ask AI perk per user
```
user_id (FK → auth.users), credits_remaining (int, default 20),
ask_ai_unlimited_until (timestamptz, null = no perk),
ask_ai_daily_used (int, default 0),   -- resets daily; capped at 50 during perk
ask_ai_daily_reset (date),
created_at
```
**Note:** The old `plan`, `plan_expires_at`, `pro_daily_used`, `pro_daily_reset` columns have been dropped. There is no longer a Pro subscription plan.

**`user_usage`** — (Legacy table, no longer used for quota enforcement. Kept for analytics.)
```
user_id, date (YYYY-MM-DD), dossiers_used, simulations_used, ai_chats_used,
compares_used, transitions_used, roadmaps_used
```

**`trending_cache`** — Shared AI-generated trending list, refreshed once per day
```
id, cache_date (date, UNIQUE), data (jsonb), created_at
```
Public read + insert (RLS policies). The first visitor of each day triggers the AI call;
all subsequent visitors read this row. No per-user AI calls for trending.

**`payments`** — Razorpay transaction log
```
id, user_id, razorpay_order_id, razorpay_payment_id, amount, currency, plan_type,
pack_id, status, created_at
```

---

## 10. Monetization Model

### 10.1 Credits System

All AI features use a **unified credits balance** (`credits_remaining` in `user_profiles`).
No daily limits. No subscription tiers. No Pro plan. One number.

| Feature | Credit Cost |
|---|---|
| Career Dossier | 3 |
| Career Comparison | 2 |
| Career Transition | 2 |
| Career Roadmap | 2 |
| Day-in-Life Simulation (full session) | 5 |
| Interview Prep | 1 |
| AI Chat message | 1 (free during Ask AI perk) |
| GBU Analysis | 0 (included in dossier) |
| PDF Export | 0 (free for all) |
| Career Quiz | 0 (free) |
| Mood Match | 0 (free) |
| All standard-model features (suggestions, trending, related, WLB, refine, preliminary) | 0 |

### 10.2 Plans

**Free Tier** (permanent — no trial expiry, no credit card required)
- 20 credits on signup (one-time, never reset)
- All features accessible while credits last
- Quiz, Mood Match, PDF Export, and GBU always free
- Ask AI available for 1 credit/message
- Can buy credit packs anytime

### 10.3 One-Time Credit Packs (Razorpay — live)

Credits never expire. Each pack also grants an **Unlimited Ask AI perk** for a limited period.
Ask AI messages during the perk period are free, subject to a daily cap of 50.
If another pack is bought while a perk is active, the remaining days are preserved and new days are added on top.

| Pack | Price | Original Price | Credits | Ask AI Perk | Tag |
|---|---|---|---|---|---|
| Starter | ₹59 | ₹99 | 30 | 7 days unlimited | Starter |
| Popular | ₹129 | ₹249 | 75 | 15 days unlimited | Popular |
| Best Value | ₹199 | ₹399 | 120 | 30 days unlimited | Best Value |

### 10.4 Ask AI

- Available to **all users** (no Pro subscription required).
- Costs **1 credit per message** unless an Ask AI perk is active.
- Pack purchase grants unlimited Ask AI for 7/15/30 days (capped at 50 messages/day).
- When the daily cap is hit, the Worker returns HTTP 402 with `code: 'CHAT_DAILY_CAP'`.
  `ai.ts` throws `ChatDailyCapError`; pages display a "servers busy" toast.
- The floating Ask AI button always opens the panel; inside the panel the cost/perk status is shown.
- `hasUnlimitedAskai` is exposed by `UsageContext` for UI hints.

### 10.5 PDF Export

- **Free for all users.** No credits required. No Pro gate. The download button is always enabled
  on `JobDetailPage` for logged-in users.

### 10.6 Credit Enforcement Flow

```
User clicks feature → ai.ts sends request to Worker with JWT + X-Usage-Type header
→ Worker looks up user_profiles
  → usageType is free (0 cost): always allowed, no DB write
  → usageType is 'chat' + active Ask AI perk:
    → Check/reset daily counter (ask_ai_daily_used, ask_ai_daily_reset)
    → Daily cap (50) hit: HTTP 402 { code: 'CHAT_DAILY_CAP' } → ChatDailyCapError toast
    → Under cap: increment ask_ai_daily_used → proceed
  → Credit-costing usageType:
    → Insufficient credits: HTTP 402 { code: 'QUOTA_EXCEEDED' } → QuotaExceededError
      → Page catches it → triggerPaywall('featureName', err.detail)
      → PaywallModal opens (shows credit packs)
    → Enough credits: Worker atomically decrements credits_remaining → proceeds with Groq call
```

### 10.7 Paywall UI

**Navbar credits badge** — Shows `⚡{N}` credits count for logged-in users, clickable → `/pricing`.
Pre-auth: a plain **Pricing** text link in the navbar replaces the badge.

**`PaywallModal`** (`src/app/components/PaywallModal.tsx`)
- Triggers automatically on any `QuotaExceededError` via `PaywallContext`.
- Shows only **Credit Packs** (no Pro tab).
- Each pack shows its Ask AI perk days.
- `handleRazorpay(packId)` calls Worker `/payment/create-order` → opens Razorpay Checkout → calls Worker `/payment/verify` → refreshes credits on success.

**`PricingPage`** (`/pricing`)
- Standalone pricing page; linked from the credits badge.
- Free tier strip + 3 pack cards + credit cost breakdown table + FAQ accordion.
- Same `handleRazorpay()` integration as PaywallModal.

### 10.8 Razorpay Integration (Live)

Razorpay is fully integrated:
- **Key ID:** `rzp_live_SOpKaXXi0qi4VA` (hardcoded in `worker/src/index.ts`)
- Worker endpoints: `POST /payment/create-order` and `POST /payment/verify`
- Pack config lives in `PACK_CONFIG` in `worker/src/index.ts`
- On successful payment: Worker adds credits + sets `ask_ai_unlimited_until` in `user_profiles`
- Required Worker secrets: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

To add a new pack: add to `PACK_CONFIG` in `worker/src/index.ts` and `PACKS` array in
`PaywallModal.tsx` and `PricingPage.tsx`.

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
The `navLinks` array defines every desktop nav item. Archive and Settings are auth-gated —
only shown to logged-in users. Pre-auth visitors see a **Pricing** text link instead of the
credits badge.

```ts
// Logged-in users see all 8 links:
const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/mood', label: 'Mood' },
  { to: '/career-transition', label: 'Transition' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/compare', label: 'Compare' },
  // Only when user is logged in:
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
