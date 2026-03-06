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

// Daily usage limits (per user per day)
export const FREE_DAILY_LIMITS: Record<string, number> = {
  dossiers_used: 3,
  simulations_used: 1,
  ai_chats_used: 5,
  compares_used: 1,
  transitions_used: 1,
  roadmaps_used: 1,
};

export const PRO_DAILY_LIMITS: Record<string, number> = {
  dossiers_used: 15,
  simulations_used: 5,
  ai_chats_used: 50,
  compares_used: 5,
  transitions_used: 5,
  roadmaps_used: 5,
};

// Maps usage type → DB column (null = not metered / always free)
export const QUOTA_COLUMN: Record<string, string | null> = {
  dossier: 'dossiers_used',
  simulation: 'simulations_used',
  chat: 'ai_chats_used',
  compare: 'compares_used',
  transition: 'transitions_used',
  roadmap: 'roadmaps_used',
  // Free types — still routed through proxy but not counted against quota
  suggestion: null,
  trending: null,
  preliminary: null,
  related: null,
  wlb: null,
  quiz: null,
  mood: null,
  refine: null,
  interview: null,
  gbu: null,
};
