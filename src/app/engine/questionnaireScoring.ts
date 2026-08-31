/**
 * CareerCase × SIH26044 — Deterministic questionnaire scoring engine.
 *
 * Provides transparent, reproducible scoring for questionnaires with explicit scoring policies.
 * Free-text and structured-scenario questions are NOT automatically scored—they require human review.
 * Scoring is deterministic: same answers + same version = same result.
 *
 * CRITICAL BOUNDARIES:
 * - Computed scores are NOT hiring probabilities
 * - Scores are NOT candidate quality rankings
 * - Scores are context-bound assessed evidence only
 * - No silent AI scoring of free-text responses
 * - Deterministic rules only, no opaque models
 */

import type {
  QuestionnaireQuestion,
  QuestionnaireResponse,
  QuestionnaireScoringPolicy,
  QuestionnaireScoreResult,
} from '../types/questionnaire';

/**
 * Score a single response based on question configuration
 */
export function scoreResponse(
  question: QuestionnaireQuestion,
  response: QuestionnaireResponse,
): number | null {
  // Free-text and structured-scenario questions are never auto-scored
  if (
    question.question_type === 'text' ||
    question.question_type === 'structured_scenario'
  ) {
    return null;
  }

  // If question has no scoring_weight, it's not scored
  if (question.scoring_weight == null || question.scoring_weight === 0) {
    return null;
  }

  const weight = question.scoring_weight;

  switch (question.question_type) {
    case 'single_choice': {
      // Choice questions remain unscored until a separate, non-browser-readable
      // answer-key contract exists. Option order is never scoring authority.
      return null;
    }

    case 'multiple_choice': {
      return null;
    }

    case 'numeric': {
      // Scale-based scoring: normalize numeric response within min/max range
      const value = response.response_value as number;
      const { numeric_min, numeric_max } = question;

      if (numeric_min == null || numeric_max == null) return null;

      // Clamp value to range
      const clamped = Math.max(
        numeric_min,
        Math.min(numeric_max, value),
      );

      // Normalize to [0, 1] and scale by weight
      const normalized = (clamped - numeric_min) / (numeric_max - numeric_min);
      return normalized * weight;
    }

    default:
      return null;
  }
}

/**
 * Compute total score for a submission based on scoring policy
 */
export function computeQuestionnaireScore(
  questions: QuestionnaireQuestion[],
  responses: QuestionnaireResponse[],
  scoringPolicy: QuestionnaireScoringPolicy | null,
): QuestionnaireScoreResult | null {
  if (!scoringPolicy) return null;

  const responseMap = new Map(
    responses.map((r) => [r.question_id, r]),
  );

  const questionScores: QuestionnaireScoreResult['question_scores'] = [];
  let totalScore = 0;
  let maxScore = 0;

  for (const question of questions) {
    const response = responseMap.get(question.id);
    if (!response) continue; // Unanswered question

    const responseScore = scoreResponse(question, response);
    if (responseScore == null) continue; // Not a scoreable question

    const maxPossible = question.scoring_weight || 0;

    questionScores.push({
      question_id: question.id,
      response_score: responseScore,
      max_possible: maxPossible,
    });

    totalScore += responseScore;
    maxScore += maxPossible;
  }

  // Determine band if configured
  let band: QuestionnaireScoreResult['band'];
  if (scoringPolicy.rules.bands) {
    const matchingBand = scoringPolicy.rules.bands.find(
      (b) => totalScore >= b.min_score && totalScore <= b.max_score,
    );
    if (matchingBand) {
      band = matchingBand;
    }
  }

  return {
    computed_score: totalScore,
    max_score: maxScore,
    scoring_policy_version: scoringPolicy.version,
    question_scores: questionScores,
    band,
  };
}

/**
 * Validate submission completeness
 */
export function validateSubmissionCompleteness(
  questions: QuestionnaireQuestion[],
  responses: QuestionnaireResponse[],
  requiredQuestionIds: string[], // Configured required questions
): {
  is_complete: boolean;
  missing_required: string[];
  total_questions: number;
  answered_questions: number;
} {
  const answeredIds = new Set(responses.map((r) => r.question_id));

  const missingRequired = requiredQuestionIds.filter(
    (id) => !answeredIds.has(id),
  );

  return {
    is_complete: missingRequired.length === 0,
    missing_required: missingRequired,
    total_questions: questions.length,
    answered_questions: responses.length,
  };
}

/**
 * Conservative skill extraction from questionnaire questions.
 * Only returns skills with explicit conservative mappings.
 */
export function extractQuestionnaireSkills(
  questions: QuestionnaireQuestion[],
): Array<{ skillId?: string; label: string }> {
  const skillMap = new Map<string, { skillId?: string; label: string }>();

  for (const question of questions) {
    for (const skillRef of question.skill_refs) {
      const key = skillRef.skillId || skillRef.label;
      if (!skillMap.has(key)) {
        skillMap.set(key, skillRef);
      }
    }
  }

  return Array.from(skillMap.values());
}

/**
 * Explain score result in human-readable terms
 */
export function explainScore(
  result: QuestionnaireScoreResult,
): string {
  const percentage = (
    (result.computed_score / result.max_score) *
    100
  ).toFixed(1);

  let explanation = `Scored ${result.computed_score} out of ${result.max_score} (${percentage}%) based on ${result.question_scores.length} scoreable questions.`;

  if (result.band) {
    explanation += ` Result band: ${result.band.label}.`;
  }

  explanation += ` Scoring is deterministic and reproducible: same answers always produce the same score. This score is context-bound assessed evidence, not a hiring probability or candidate quality ranking.`;

  return explanation;
}
