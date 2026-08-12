// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Guidance System — Core Type Definitions
// NORMATIVE interfaces — match field names exactly (other phases import these)
// ══════════════════════════════════════════════════════════════════════════════

// ─── User Segment ─────────────────────────────────────────────────────────────
export type Segment = 
  | 'school_student' 
  | 'college_student' 
  | 'job_seeker' 
  | 'career_switcher' 
  | 'professional';

// ─── Skill Proficiency ────────────────────────────────────────────────────────
export type Proficiency = 0 | 1 | 2 | 3 | 4;
// 0 = none, 1 = beginner, 2 = intermediate, 3 = advanced, 4 = expert

// ─── Evidence Types ───────────────────────────────────────────────────────────
export type EvidenceType = 
  | 'self_reported' 
  | 'inferred_from_resume' 
  | 'assessed' 
  | 'credentialed' 
  | 'inferred_from_activity';

// ─── Skill Evidence & Claims ──────────────────────────────────────────────────
export interface SkillEvidence {
  type: EvidenceType;
  description: string;
  confidence: number;           // 0–1
  observedAt: string;           // ISO date
}

export interface SkillClaim {
  skillId: string;
  proficiency: Proficiency;
  confidence: number;           // 0–1 (computed from evidence)
  evidence: SkillEvidence[];
}

// ─── Assessment Results ───────────────────────────────────────────────────────
export interface RiasecScores {
  R: number;  // Realistic (0–100)
  I: number;  // Investigative
  A: number;  // Artistic
  S: number;  // Social
  E: number;  // Enterprising
  C: number;  // Conventional
}

export interface AptitudeScores {
  numerical: number;            // 0–100
  verbal: number;
  logical: number;
  spatial: number;
}

export interface WorkValues {
  stability: number;            // 0–100 each, sums normalized
  growth: number;
  autonomy: number;
  impact: number;
  balance: number;
  compensation: number;
}

// ─── Aspiration ───────────────────────────────────────────────────────────────
export interface Aspiration {
  statement: string;            // user's own words, ≤2 sentences
  horizonYears: number;
  themes: string[];             // lowercase keywords
  dreamOccupationIds: string[]; // resolved occupation IDs
  entrepreneurialIntent: 'none' | 'curious' | 'strong';
  capturedVia: 'conversation' | 'form';
}

// ─── Constraints ──────────────────────────────────────────────────────────────
export interface Constraints {
  location: string;
  canRelocate: boolean;
  weeklyLearningHours: number;
  budgetLevel: 'low' | 'medium' | 'high';
  languages: string[];
  needsIncomeContinuity: boolean;
}

// ─── Experience & Education ───────────────────────────────────────────────────
export interface Experience {
  title: string;
  occupationId?: string;        // resolved from KB if matched
  years: number;
  description: string;
}

export interface Education {
  level: 
    | 'below_10'
    | 'class_10'
    | 'class_12'
    | 'iti_diploma'
    | 'undergraduate'
    | 'postgraduate';
  field?: string;
  nsqfLevel?: number;
}

// ─── Career Passport ──────────────────────────────────────────────────────────
// The living profile that drives all matching & pathways
export interface CareerPassport {
  segment: Segment;
  education: Education;
  experiences: Experience[];
  skills: SkillClaim[];
  riasec?: RiasecScores;
  aptitude?: AptitudeScores;
  values?: WorkValues;
  aspiration?: Aspiration;
  constraints: Constraints;
  completeness: number;          // 0–100, computed
  version: number;
  updatedAt: string;             // ISO timestamp
}

// ─── Recommendation Engine Types ──────────────────────────────────────────────
export type FitDimension = 
  | 'interest'
  | 'aptitude'
  | 'values'
  | 'skill'
  | 'transferable'
  | 'experience'
  | 'aspiration'
  | 'market'
  | 'progression'
  | 'learningFeasibility'
  | 'geographic';

export interface ComponentScore {
  dimension: FitDimension;
  score: number;                 // 0–100
  weight: number;                // from segment weight profile
  note: string;                  // deterministic explanation
  dataAvailable: boolean;        // false → neutral 50, prompt to complete
}

export type RecommendationGroup = 
  | 'best_fit'
  | 'growth'
  | 'easiest_transition'
  | 'aspiration'
  | 'exploration'
  | 'vocational_entrepreneurial';

export interface CareerRecommendation {
  occupationId: string;
  totalScore: number;            // 0–100 weighted composite
  confidence: 'low' | 'medium' | 'high';  // driven by passport completeness + evidence
  group: RecommendationGroup;
  components: ComponentScore[];
  topReasons: string[];          // deterministic, from explain.ts
  whyNotHigher: string[];        // counterfactual levers
  skillGapPreview: Array<{ skillId: string; severity: number }>;  // top 3
}

export interface RecommendationSet {
  generatedAt: string;           // ISO timestamp
  passportVersion: number;
  kbVersion: string;
  segment: Segment;
  weightsUsed: Record<FitDimension, number>;
  recommendations: CareerRecommendation[];
}

// ─── Skill Gap & Pathway Types ────────────────────────────────────────────────
export interface SkillGap {
  skillId: string;
  required: Proficiency;
  current: Proficiency;
  importance: number;            // 0–1 from occupation requirement
  confidence: number;            // current skill claim confidence
  severity: number;              // 0–100 computed gap severity
}

export interface GapReport {
  occupationId: string;
  gaps: SkillGap[];
  transferable: Array<{ skillId: string; fromExperience: string }>;
  sgi: number;                   // Skill Gap Index 0–100 (lower = smaller gap)
  readiness: number;             // 100 − sgi
}

export type RouteKind = 
  | 'direct' 
  | 'stepping_stone' 
  | 'qualification_first';

export interface PathwayStep {
  kind: 
    | 'validate_skill'
    | 'learn'
    | 'qualification'
    | 'project'
    | 'transition_role'
    | 'target';
  label: string;
  refId?: string;                // skill/qualification/occupation ID
  nsqfLevel?: number;
  estMonths: number;
  done: boolean;
}

export interface PathwayRoute {
  kind: RouteKind;
  label: string;                 // "Fastest", "Lower-risk", "Credential route"
  tradeoff: string;              // one-liner explaining the trade-off
  totalMonths: number;
  steps: PathwayStep[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PathwayPlan {
  occupationId: string;
  routes: PathwayRoute[];        // exactly 3 routes
  chosenRoute?: RouteKind;
  gapReport: GapReport;
  createdAt: string;             // ISO timestamp
}
