// ─── Model Configuration ───────────────────────────────────────
// Change model names here when you want to upgrade/switch models
// without touching any other code.

export const MODELS = {
  premium: 'llama-3.3-70b-versatile',
  standard: 'llama-3.1-8b-instant',
} as const;

export type ModelTier = keyof typeof MODELS;

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
