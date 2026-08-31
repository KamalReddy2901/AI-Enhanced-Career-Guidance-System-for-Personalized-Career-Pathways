/**
 * CareerCase × SIH26044: questionnaire domain logic QA.
 * Validates deterministic scoring, completeness validation, and skill extraction.
 */

import assert from 'node:assert';
import type {
  QuestionnaireQuestion,
  QuestionnaireResponse,
  QuestionnaireScoringPolicy,
} from '../src/app/types/questionnaire.js';
import {
  scoreResponse,
  computeQuestionnaireScore,
  validateSubmissionCompleteness,
  extractQuestionnaireSkills,
  explainScore,
} from '../src/app/engine/questionnaireScoring.js';

function createMockQuestion(
  partial: Partial<QuestionnaireQuestion>,
): QuestionnaireQuestion {
  return {
    id: partial.id || 'q1',
    questionnaire_version_id: partial.questionnaire_version_id || 'qv1',
    ordinal: partial.ordinal ?? 0,
    question_type: partial.question_type || 'text',
    question_text: partial.question_text || 'Test question',
    choice_options: partial.choice_options,
    numeric_min: partial.numeric_min,
    numeric_max: partial.numeric_max,
    skill_refs: partial.skill_refs || [],
    scoring_weight: partial.scoring_weight,
    created_at: partial.created_at || new Date().toISOString(),
  };
}

function createMockResponse(
  partial: Partial<QuestionnaireResponse>,
): QuestionnaireResponse {
  return {
    id: partial.id || 'r1',
    submission_id: partial.submission_id || 'sub1',
    question_id: partial.question_id || 'q1',
    response_value: partial.response_value || '',
    response_score: partial.response_score || null,
    answered_at: partial.answered_at || new Date().toISOString(),
  };
}

console.log('Running questionnaire domain logic QA...\n');

// Test 1: Free-text questions are never auto-scored
{
  const question = createMockQuestion({
    id: 'q_text',
    question_type: 'text',
    scoring_weight: 10,
  });

  const response = createMockResponse({
    question_id: 'q_text',
    response_value: 'My detailed answer here.',
  });

  const score = scoreResponse(question, response);
  assert.strictEqual(
    score,
    null,
    'Free-text question should never be auto-scored',
  );
  console.log('✓ Free-text questions are never auto-scored');
}

// Test 2: Structured scenario questions are never auto-scored
{
  const question = createMockQuestion({
    id: 'q_scenario',
    question_type: 'structured_scenario',
    scoring_weight: 15,
  });

  const response = createMockResponse({
    question_id: 'q_scenario',
    response_value: { scenario: 'response', details: 'complex' },
  });

  const score = scoreResponse(question, response);
  assert.strictEqual(
    score,
    null,
    'Structured scenario should never be auto-scored',
  );
  console.log('✓ Structured scenario questions are never auto-scored');
}

// Test 3: Questions without scoring_weight are not scored
{
  const question = createMockQuestion({
    id: 'q_no_weight',
    question_type: 'single_choice',
    choice_options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
    scoring_weight: undefined,
  });

  const response = createMockResponse({
    question_id: 'q_no_weight',
    response_value: 'a',
  });

  const score = scoreResponse(question, response);
  assert.strictEqual(
    score,
    null,
    'Question without scoring_weight should not be scored',
  );
  console.log('✓ Questions without scoring_weight are not scored');
}

// Test 4: Choice order is not scoring authority
{
  const question = createMockQuestion({
    id: 'q_single',
    question_type: 'single_choice',
    choice_options: [
      { value: 'correct', label: 'Correct Answer' },
      { value: 'wrong', label: 'Wrong Answer' },
    ],
    scoring_weight: 10,
  });

  const correctResponse = createMockResponse({
    question_id: 'q_single',
    response_value: 'correct',
  });

  const score = scoreResponse(question, correctResponse);
  assert.strictEqual(score, null, 'Choice response must remain unscored without a private answer key');
  console.log('✓ Choice order is never used as scoring authority');
}

// Test 5: Numeric scoring with range normalization
{
  const question = createMockQuestion({
    id: 'q_numeric',
    question_type: 'numeric',
    numeric_min: 0,
    numeric_max: 10,
    scoring_weight: 5,
  });

  const response = createMockResponse({
    question_id: 'q_numeric',
    response_value: 5,
  });

  const score = scoreResponse(question, response);
  // Normalized: (5-0)/(10-0) * 5 = 2.5
  assert.strictEqual(score, 2.5, 'Numeric score should normalize to range');
  console.log('✓ Numeric scoring normalizes within min/max range');
}

// Test 6: Compute total score with scoring policy
{
  const scoringPolicy: QuestionnaireScoringPolicy = {
    version: 'v1',
    rules: {
      method: 'weighted_sum',
      max_score: 10,
    },
  };

  const questions = [
    createMockQuestion({
      id: 'q1',
      question_type: 'single_choice',
      choice_options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      scoring_weight: 10,
    }),
    createMockQuestion({
      id: 'q2',
      question_type: 'numeric',
      numeric_min: 0,
      numeric_max: 10,
      scoring_weight: 10,
    }),
    createMockQuestion({
      id: 'q3',
      question_type: 'text',
      scoring_weight: 5, // Should not be scored
    }),
  ];

  const responses = [
    createMockResponse({ question_id: 'q1', response_value: 'a' }),
    createMockResponse({ question_id: 'q2', response_value: 10 }), // Max value
    createMockResponse({ question_id: 'q3', response_value: 'Text answer' }),
  ];

  const result = computeQuestionnaireScore(
    questions,
    responses,
    scoringPolicy,
  );

  assert.ok(result, 'Score result should exist');
  assert.strictEqual(
    result.computed_score,
    10,
    'Only the numeric question should be scored',
  );
  assert.strictEqual(result.max_score, 10);
  assert.strictEqual(result.scoring_policy_version, 'v1');
  assert.strictEqual(
    result.question_scores.length,
    1,
    'Only questions with an authoritative scoring contract are included',
  );
  console.log('✓ Total score computation with scoring policy works');
}

// Test 7: Score with bands
{
  const scoringPolicy: QuestionnaireScoringPolicy = {
    version: 'v2',
    rules: {
      method: 'weighted_sum',
      max_score: 100,
      bands: [
        { min_score: 0, max_score: 49, label: 'Needs Improvement' },
        { min_score: 50, max_score: 74, label: 'Satisfactory' },
        { min_score: 75, max_score: 100, label: 'Excellent' },
      ],
    },
  };

  const questions = [
    createMockQuestion({
      id: 'q1',
      question_type: 'numeric',
      numeric_min: 0,
      numeric_max: 100,
      choice_options: undefined,
      scoring_weight: 100,
    }),
  ];

  const responses = [
    createMockResponse({ question_id: 'q1', response_value: 80 }),
  ];

  const result = computeQuestionnaireScore(
    questions,
    responses,
    scoringPolicy,
  );

  assert.ok(result, 'Score result should exist');
  assert.strictEqual(result.computed_score, 80);
  assert.ok(result.band, 'Band should be assigned');
  assert.strictEqual(result.band?.label, 'Excellent');
  console.log('✓ Score bands are correctly assigned');
}

// Test 8: Validate submission completeness
{
  const questions = [
    createMockQuestion({ id: 'q1' }),
    createMockQuestion({ id: 'q2' }),
    createMockQuestion({ id: 'q3' }),
  ];

  const responses = [
    createMockResponse({ question_id: 'q1' }),
    createMockResponse({ question_id: 'q2' }),
  ];

  const required = ['q1', 'q2', 'q3'];

  const validation = validateSubmissionCompleteness(
    questions,
    responses,
    required,
  );

  assert.strictEqual(validation.is_complete, false);
  assert.strictEqual(validation.missing_required.length, 1);
  assert.strictEqual(validation.missing_required[0], 'q3');
  assert.strictEqual(validation.total_questions, 3);
  assert.strictEqual(validation.answered_questions, 2);
  console.log('✓ Submission completeness validation works');
}

// Test 9: Extract conservative skill refs from questions
{
  const questions = [
    createMockQuestion({
      id: 'q1',
      skill_refs: [
        { skillId: 'python', label: 'Python' },
        { skillId: 'sql', label: 'SQL' },
      ],
    }),
    createMockQuestion({
      id: 'q2',
      skill_refs: [
        { skillId: 'python', label: 'Python' }, // Duplicate
        { label: 'Unresolved Skill' }, // No skillId
      ],
    }),
  ];

  const skills = extractQuestionnaireSkills(questions);

  assert.strictEqual(skills.length, 3, 'Should deduplicate and preserve all');
  assert.ok(
    skills.find((s) => s.skillId === 'python'),
    'Should include python',
  );
  assert.ok(skills.find((s) => s.skillId === 'sql'), 'Should include sql');
  assert.ok(
    skills.find((s) => !s.skillId && s.label === 'Unresolved Skill'),
    'Should include unresolved skill',
  );
  console.log('✓ Conservative skill extraction works');
}

// Test 10: Score explanation is human-readable
{
  const result = {
    computed_score: 85,
    max_score: 100,
    scoring_policy_version: 'v1',
    question_scores: [
      { question_id: 'q1', response_score: 50, max_possible: 50 },
      { question_id: 'q2', response_score: 35, max_possible: 50 },
    ],
    band: { min_score: 75, max_score: 100, label: 'Excellent' },
  };

  const explanation = explainScore(result);

  assert.ok(
    explanation.includes('85 out of 100'),
    'Explanation should include score',
  );
  assert.ok(
    explanation.includes('85.0%'),
    'Explanation should include percentage',
  );
  assert.ok(
    explanation.includes('Excellent'),
    'Explanation should include band',
  );
  assert.ok(
    explanation.includes('deterministic'),
    'Explanation should mention determinism',
  );
  assert.ok(
    explanation.includes('not a hiring probability'),
    'Explanation should clarify NOT hiring probability',
  );
  console.log('✓ Score explanation is human-readable and clarifies boundaries');
}

// Test 11: Deterministic behavior — same inputs produce same outputs
{
  const scoringPolicy: QuestionnaireScoringPolicy = {
    version: 'v1',
    rules: { method: 'weighted_sum', max_score: 20 },
  };

  const questions = [
    createMockQuestion({
      id: 'q1',
      question_type: 'single_choice',
      choice_options: [{ value: 'a', label: 'A' }],
      scoring_weight: 10,
    }),
    createMockQuestion({
      id: 'q2',
      question_type: 'numeric',
      numeric_min: 0,
      numeric_max: 10,
      scoring_weight: 10,
    }),
  ];

  const responses = [
    createMockResponse({ question_id: 'q1', response_value: 'a' }),
    createMockResponse({ question_id: 'q2', response_value: 5 }),
  ];

  const result1 = computeQuestionnaireScore(
    questions,
    responses,
    scoringPolicy,
  );
  const result2 = computeQuestionnaireScore(
    questions,
    responses,
    scoringPolicy,
  );

  assert.deepStrictEqual(
    result1,
    result2,
    'Same inputs should produce identical outputs',
  );
  console.log('✓ Scoring is deterministic and reproducible');
}

console.log('\n✅ Questionnaire domain logic QA: PASSED\n');
