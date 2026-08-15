// ─── Model Configuration ───────────────────────────────────────
// Change model names here when you want to upgrade/switch models
// without touching any other code.

export const MODELS = {
  premium: 'openai/gpt-oss-120b',
  standard: 'openai/gpt-oss-20b',
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
  // ── Phase 1: New guidance system usage types ──
  aspiration: 'premium',      // conversational aspiration elicitation
  resume_extract: 'premium',  // resume → structured skills/experience
  narrate: 'standard',        // recommendation narration polish
  counselor: 'premium',       // grounded counselor chat
  translate: 'standard',      // i18n content translation
  gap_advice: 'standard',     // skill-gap learning tips
  compatibility: 'premium',  // passport + dossier compatibility narrative
  'market-intelligence': 'premium', // structured market narrative with stronger JSON adherence
  'skill-discovery': 'premium',      // conversational skill extraction from work-experience chat
  'trajectory-projection': 'premium', // 3-year career trajectory speculative reasoning
  'aptitude-interpretation': 'standard', // short 2-sentence screener interpretation
  'aptitude-signal-discovery': 'premium', // conversational aptitude evidence extraction (4-5 turn interview)
};
