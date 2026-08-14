// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Knowledge Base — Schema Definitions
// NORMATIVE interfaces for the India-grounded career knowledge base
// ══════════════════════════════════════════════════════════════════════════════

// ─── Skills ───────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;                          // slug, e.g. 'sql-querying'
  name: string;
  category: 'technical' | 'cognitive' | 'interpersonal' | 'domain' | 'tool' | 'language';
  aliases: string[];                   // for resume extraction matching
  descriptionKey: string;              // i18n key
}

// ─── Occupations ──────────────────────────────────────────────────────────────

export interface OccupationSkillReq {
  skillId: string;
  requiredProficiency: 1 | 2 | 3 | 4;  // beginner to expert
  importance: number;                  // 0–1
}

export interface Occupation {
  id: string;                          // slug, e.g. 'data-analyst'
  title: string;
  ncoCode: string;                     // real NCO-2015 code, e.g. '2521.0100'
  nsqfEntryLevel: number;              // typical entry NSQF level 1–10
  sector: string;                      // e.g. 'IT-ITeS', 'Healthcare', 'BFSI', etc.
  cluster: string;                     // broader family: 'analytical', 'creative', 'people', 'hands_on', 'enterprising', 'structured'
  riasecProfile: {
    R: number;                         // Realistic 0–100
    I: number;                         // Investigative
    A: number;                         // Artistic
    S: number;                         // Social
    E: number;                         // Enterprising
    C: number;                         // Conventional
  };
  aptitudeProfile: {
    numerical: number;                 // 0–100 importance
    verbal: number;
    logical: number;
    spatial: number;
  };
  valuesProfile: {
    stability: number;                 // what the occupation typically offers, 0–100
    growth: number;
    autonomy: number;
    impact: number;
    balance: number;
    compensation: number;
  };
  skills: OccupationSkillReq[];        // 6–12 per occupation
  educationMin: 'class_10' | 'class_12' | 'iti_diploma' | 'undergraduate' | 'postgraduate';
  descriptionKey: string;              // i18n key
  isEmerging: boolean;
  isVocational: boolean;
  entrepreneurialFit: number;          // 0–100
}

// ─── Transitions ──────────────────────────────────────────────────────────────

export interface TransitionEdge {
  fromId: string;                      // source occupation ID
  toId: string;                        // target occupation ID
  strength: number;                    // 0–1 plausibility
  typicalYears: number;
  transferNote: string;                // concrete description of what transfers
}

// ─── Qualifications ───────────────────────────────────────────────────────────

export interface ProviderLink {
  label: string;
  url: string;
}

export interface Qualification {
  id: string;                          // slug
  name: string;
  nsqfLevel: number;                   // 1–10
  type: 'nsqf_course' | 'iti' | 'diploma' | 'degree' | 'certification' | 'apprenticeship';
  developsSkillIds: string[];
  preparesForOccupationIds: string[];
  typicalMonths: number;
  providerHint: string;                // e.g. 'Skill India Digital Hub / PMKVY centre', 'NPTEL/SWAYAM', 'State ITI'
  links?: ProviderLink[];              // stable public learning portal landing/search links
}

// ─── Market Signals ───────────────────────────────────────────────────────────

export interface MarketSignal {
  occupationId: string;
  demandIndex: number;                 // 0–100 indicative
  growthTrend: 'rising' | 'stable' | 'declining';
  regions: string[];                   // e.g. ['metro-north', 'metro-south', 'tier-2']
  observedPeriod: string;              // e.g. '2025-H2'
  source: string;                      // e.g. 'Curated from NCS postings + NSDC sector reports (indicative)'
}

// ─── License Note ─────────────────────────────────────────────────────────────

export const KB_LICENSE_NOTE = 'Curated demonstration dataset grounded in NCO-2015 codes and NSQF levels. Demand figures are indicative snapshots, not live statistics.';
