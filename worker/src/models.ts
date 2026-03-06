// ─── Model Configuration ───────────────────────────────────────
// Change model names here when you want to upgrade/switch models
// without touching any other code.

export const MODELS = {
  // High-quality: used for dossiers, simulations, interviews, roadmaps, chat
  premium: 'llama-3.3-70b-versatile',
  // Fast + cheap: used for autocomplete, suggestions, preliminary previews
  standard: 'llama-3.1-8b-instant',
} as const;

export type ModelTier = keyof typeof MODELS;

// Maps each usage type to a model tier
export const USAGE_MODEL_TIER: Record<string, ModelTier> = {
  dossier: 'premium',
  simulation: 'premium',
  chat: 'premium',
  interview: 'premium',
  compare: 'premium',
  transition: 'premium',
  roadmap: 'premium',
  gbu: 'premium',
  suggestion: 'standard',
  trending: 'standard',
  preliminary: 'standard',
  related: 'standard',
  wlb: 'standard',
  quiz: 'standard',
  mood: 'standard',
  refine: 'standard',
};

// ─── Credit Costs per usage type ───────────────────────────────
// Keep in sync with CREDIT_COSTS in src/app/context/UsageContext.tsx
//
// | Feature              | Credits | Reasoning                                     |
// |----------------------|---------|-----------------------------------------------|
// | Career Dossier       | 3       | Highest token usage (70B ~4k output), max val |
// | Simulation (session)| 5       | Full session: 10 scenarios + final assessment |
// | Career Comparison    | 2       | Two-career analysis, premium model             |
// | Career Transition    | 2       | Detailed multi-phase plan, premium model       |
// | Career Roadmap       | 2       | Structured multi-month plan, premium model     |
// | AI Chat (per msg)    | 1       | Pro-only feature, credit as safety net         |
// | Interview Prep       | 1       | Q&A generation, premium model                  |
// | GBU Analysis         | 0       | Included in dossier cost — not charged twice   |
// | All others           | 0       | Standard model, free forever                   |

export const CREDIT_COSTS: Record<string, number> = {
  dossier: 3,
  simulation: 5,
  compare: 2,
  transition: 2,
  roadmap: 2,
  chat: 1,
  interview: 1,
  gbu: 0,
  // Free (0 credits) — standard model, unmetered
  suggestion: 0,
  trending: 0,
  preliminary: 0,
  related: 0,
  wlb: 0,
  quiz: 0,
  mood: 0,
  refine: 0,
};

// Credits given to new users on first signup (one-time, no daily reset)
export const FREE_STARTING_CREDITS = 20;

// Pro plan: credits allowed per UTC day (resets at midnight UTC)
export const PRO_DAILY_CREDITS = 100;
