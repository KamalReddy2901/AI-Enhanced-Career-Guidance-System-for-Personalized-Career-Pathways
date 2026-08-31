/**
 * CareerCase × SIH26044 — Industry-authored questionnaire types.
 *
 * Questionnaires support technical and soft-skill evaluation with explicit human publication,
 * deterministic scoring where appropriate, and bounded assessed evidence provenance. Free-text
 * answers must NOT silently produce high-impact automated suitability/readiness judgments.
 */

export type QuestionnaireQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'numeric'
  | 'text'
  | 'structured_scenario';

export type QuestionnaireStatus = 'draft' | 'published' | 'archived';

export type QuestionnaireScopeDeclaration =
  | 'opportunity_specific'
  | 'reusable_technical'
  | 'reusable_soft_skill';

/**
 * Deterministic scoring policy for questionnaires.
 * Only applies to choice/numeric questions with explicit rules.
 * Free-text/scenario questions must not be auto-scored without human review.
 */
export interface QuestionnaireScoringPolicy {
  version: string;
  rules: {
    /** Scoring method: 'weighted_sum' | 'points_based' | 'custom' */
    method: string;
    /** Maximum possible score */
    max_score: number;
    /** Optional: scoring bands/thresholds */
    bands?: Array<{
      min_score: number;
      max_score: number;
      label: string;
    }>;
  };
}

export interface SkillRef {
  skillId?: string; // Canonical skill ID if conservatively resolved
  label: string; // Literal or canonical label
}

export interface Questionnaire {
  id: string;
  owner_organization_id: string;
  current_version_id: string | null;
  status: QuestionnaireStatus;
  created_by_actor_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireVersion {
  id: string;
  questionnaire_id: string;
  version_number: number;
  status: QuestionnaireStatus;
  title: string;
  description: string;
  scope_declaration: QuestionnaireScopeDeclaration;
  scoring_policy: QuestionnaireScoringPolicy | null;
  created_by_actor_id: string;
  created_at: string;
  published_at: string | null;
}

export interface QuestionnaireQuestion {
  id: string;
  questionnaire_version_id: string;
  ordinal: number;
  question_type: QuestionnaireQuestionType;
  question_text: string;
  choice_options?: Array<{ value: string; label: string }>;
  numeric_min?: number; // For numeric type
  numeric_max?: number;
  skill_refs: SkillRef[]; // Conservative skill linkage
  scoring_weight?: number; // Null = not scored, or handled at questionnaire level
  created_at: string;
}

export interface OpportunityQuestionnaireAssignment {
  id: string;
  opportunity_version_id: string;
  questionnaire_id: string;
  questionnaire_version_id: string;
  required: boolean;
  ordinal: number;
  created_at: string;
}

export interface QuestionnaireSubmission {
  id: string;
  questionnaire_version_id: string;
  respondent_actor_id: string;
  opportunity_id: string | null;
  opportunity_version_id: string | null;
  started_at: string;
  submitted_at: string | null;
  computed_score: number | null;
  score_computed_at: string | null;
  scoring_policy_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  submission_id: string;
  question_id: string;
  response_value:
    | string // text, single_choice
    | number // numeric
    | string[] // multiple_choice
    | Record<string, unknown>; // structured_scenario
  response_score: number | null;
  answered_at: string;
}

/**
 * Client-side form data for creating/editing questionnaire
 */
export interface QuestionnaireFormData {
  title: string;
  description: string;
  scope_declaration: QuestionnaireScopeDeclaration;
  questions: Array<{
    question_type: QuestionnaireQuestionType;
    question_text: string;
    choice_options?: Array<{ value: string; label: string }>;
    numeric_min?: number;
    numeric_max?: number;
    skill_refs?: SkillRef[];
    scoring_weight?: number;
  }>;
  scoring_policy?: QuestionnaireScoringPolicy;
}

/**
 * Deterministic scoring result
 */
export interface QuestionnaireScoreResult {
  computed_score: number;
  max_score: number;
  scoring_policy_version: string;
  question_scores: Array<{
    question_id: string;
    response_score: number;
    max_possible: number;
  }>;
  band?: {
    label: string;
    min_score: number;
    max_score: number;
  };
}

/**
 * Submission progress state
 */
export interface SubmissionProgress {
  total_questions: number;
  answered_questions: number;
  required_unanswered: string[]; // question IDs
  is_complete: boolean;
}

/**
 * Evidence record derived from questionnaire submission.
 * Provenance is 'assessed' with explicit questionnaire/version context.
 * NOT issuer-verified, NOT universal certification.
 */
export interface QuestionnaireEvidenceRecord {
  submission_id: string;
  questionnaire_id: string;
  questionnaire_version_id: string;
  questionnaire_title: string;
  opportunity_id: string | null;
  skill_refs: SkillRef[];
  computed_score: number | null;
  max_score: number | null;
  submitted_at: string;
  provenance: 'assessed'; // Fixed provenance type
  scope: string; // e.g., "Technical screening questionnaire for [Opportunity Title]"
}
