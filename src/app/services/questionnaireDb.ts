/**
 * CareerCase × SIH26044 — Questionnaire service (browser RLS operations).
 *
 * Handles questionnaire authoring, submission, and retrieval through authenticated
 * Supabase client with row-level security. Tenant isolation enforced by RLS policies.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Questionnaire,
  QuestionnaireVersion,
  QuestionnaireQuestion,
  QuestionnaireSubmission,
  QuestionnaireResponse,
  QuestionnaireFormData,
  OpportunityQuestionnaireAssignment,
  QuestionnaireScoringPolicy,
} from '../types/questionnaire';
import {
  computeQuestionnaireScore,
  validateSubmissionCompleteness,
} from '../engine/questionnaireScoring';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a new questionnaire (draft)
 */
export async function createQuestionnaire(
  formData: QuestionnaireFormData,
  actorId: string,
  organizationId: string,
): Promise<{ questionnaire: Questionnaire; version: QuestionnaireVersion }> {
  // Insert questionnaire
  const { data: questionnaire, error: qError } = await supabase
    .from('sih26044.questionnaires')
    .insert({
      owner_organization_id: organizationId,
      status: 'draft',
      created_by_actor_id: actorId,
    })
    .select()
    .single();

  if (qError || !questionnaire) {
    throw new Error(`Failed to create questionnaire: ${qError?.message}`);
  }

  // Insert version
  const { data: version, error: vError } = await supabase
    .from('sih26044.questionnaire_versions')
    .insert({
      questionnaire_id: questionnaire.id,
      version_number: 1,
      status: 'draft',
      title: formData.title,
      description: formData.description,
      scope_declaration: formData.scope_declaration,
      scoring_policy: formData.scoring_policy || null,
      created_by_actor_id: actorId,
    })
    .select()
    .single();

  if (vError || !version) {
    throw new Error(`Failed to create questionnaire version: ${vError?.message}`);
  }

  // Update current_version_id
  await supabase
    .from('sih26044.questionnaires')
    .update({ current_version_id: version.id })
    .eq('id', questionnaire.id);

  // Insert questions
  const questionInserts = formData.questions.map((q, idx) => ({
    questionnaire_version_id: version.id,
    ordinal: idx,
    question_type: q.question_type,
    question_text: q.question_text,
    choice_options: q.choice_options || null,
    numeric_min: q.numeric_min || null,
    numeric_max: q.numeric_max || null,
    skill_refs: q.skill_refs || [],
    scoring_weight: q.scoring_weight || null,
  }));

  const { error: qsError } = await supabase
    .from('sih26044.questionnaire_questions')
    .insert(questionInserts);

  if (qsError) {
    throw new Error(`Failed to create questions: ${qsError.message}`);
  }

  return { questionnaire, version };
}

/**
 * Publish a questionnaire version
 */
export async function publishQuestionnaireVersion(
  versionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('sih26044.questionnaire_versions')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', versionId)
    .eq('status', 'draft'); // Only publish drafts

  if (error) {
    throw new Error(`Failed to publish questionnaire: ${error.message}`);
  }

  // Update questionnaire status
  const { data: version } = await supabase
    .from('sih26044.questionnaire_versions')
    .select('questionnaire_id')
    .eq('id', versionId)
    .single();

  if (version) {
    await supabase
      .from('sih26044.questionnaires')
      .update({ status: 'published' })
      .eq('id', version.questionnaire_id);
  }
}

/**
 * Fetch questionnaire with questions
 */
export async function getQuestionnaireVersion(
  versionId: string,
): Promise<{
  version: QuestionnaireVersion;
  questions: QuestionnaireQuestion[];
}> {
  const { data: version, error: vError } = await supabase
    .from('sih26044.questionnaire_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (vError || !version) {
    throw new Error(`Failed to fetch questionnaire version: ${vError?.message}`);
  }

  const { data: questions, error: qError } = await supabase
    .from('sih26044.questionnaire_questions')
    .select('*')
    .eq('questionnaire_version_id', versionId)
    .order('ordinal');

  if (qError) {
    throw new Error(`Failed to fetch questions: ${qError.message}`);
  }

  return { version, questions: questions || [] };
}

/**
 * Assign questionnaire to opportunity
 */
export async function assignQuestionnaireToOpportunity(
  opportunityVersionId: string,
  questionnaireId: string,
  required: boolean,
  ordinal: number,
): Promise<OpportunityQuestionnaireAssignment> {
  const { data, error } = await supabase
    .from('sih26044.opportunity_questionnaire_assignments')
    .insert({
      opportunity_version_id: opportunityVersionId,
      questionnaire_id: questionnaireId,
      required,
      ordinal,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to assign questionnaire: ${error?.message}`);
  }

  return data;
}

/**
 * Start a new submission
 */
export async function startSubmission(
  versionId: string,
  actorId: string,
  opportunityId?: string,
  opportunityVersionId?: string,
): Promise<QuestionnaireSubmission> {
  const { data, error } = await supabase
    .from('sih26044.questionnaire_submissions')
    .insert({
      questionnaire_version_id: versionId,
      respondent_actor_id: actorId,
      opportunity_id: opportunityId || null,
      opportunity_version_id: opportunityVersionId || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to start submission: ${error?.message}`);
  }

  return data;
}

/**
 * Save a response
 */
export async function saveResponse(
  submissionId: string,
  questionId: string,
  responseValue: QuestionnaireResponse['response_value'],
): Promise<QuestionnaireResponse> {
  const { data, error } = await supabase
    .from('sih26044.questionnaire_responses')
    .upsert(
      {
        submission_id: submissionId,
        question_id: questionId,
        response_value: responseValue,
      },
      {
        onConflict: 'submission_id,question_id',
      },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save response: ${error?.message}`);
  }

  return data;
}

/**
 * Submit questionnaire (finalize submission with deterministic scoring)
 */
export async function submitQuestionnaire(
  submissionId: string,
): Promise<QuestionnaireSubmission> {
  // Fetch submission, version, questions, and responses
  const { data: submission } = (await supabase
    .from('sih26044.questionnaire_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()) as { data: any };

  if (!submission) {
    throw new Error('Submission not found');
  }

  const { data: version } = await supabase
    .from('sih26044.questionnaire_versions')
    .select('*')
    .eq('id', submission.questionnaire_version_id)
    .single();

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  const { data: questions } = await supabase
    .from('sih26044.questionnaire_questions')
    .select('*')
    .eq('questionnaire_version_id', submission.questionnaire_version_id)
    .order('ordinal');

  const { data: responses } = await supabase
    .from('sih26044.questionnaire_responses')
    .select('*')
    .eq('submission_id', submissionId);

  // Validate completeness (assume all questions required for now)
  const validation = validateSubmissionCompleteness(
    questions || [],
    responses || [],
    (questions || []).map((q) => q.id),
  );

  if (!validation.is_complete) {
    throw new Error(
      `Submission incomplete: ${validation.missing_required.length} required questions unanswered`,
    );
  }

  // Compute score if scoring policy exists
  const scoringPolicy = version.scoring_policy as QuestionnaireScoringPolicy | null;
  const scoreResult = computeQuestionnaireScore(
    questions || [],
    responses || [],
    scoringPolicy,
  );

  // Update submission
  const updatePayload: Partial<QuestionnaireSubmission> = {
    submitted_at: new Date().toISOString(),
  };

  if (scoreResult) {
    updatePayload.computed_score = scoreResult.computed_score;
    updatePayload.score_computed_at = new Date().toISOString();
    updatePayload.scoring_policy_version =
      scoreResult.scoring_policy_version;

    // Update response scores
    for (const qs of scoreResult.question_scores) {
      await supabase
        .from('sih26044.questionnaire_responses')
        .update({ response_score: qs.response_score })
        .eq('submission_id', submissionId)
        .eq('question_id', qs.question_id);
    }
  }

  const { data, error } = await supabase
    .from('sih26044.questionnaire_submissions')
    .update(updatePayload)
    .eq('id', submissionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to submit questionnaire: ${error?.message}`);
  }

  return data;
}

/**
 * Get student's submission for a questionnaire
 */
export async function getStudentSubmission(
  versionId: string,
  actorId: string,
  opportunityId?: string,
): Promise<{
  submission: QuestionnaireSubmission | null;
  responses: QuestionnaireResponse[];
}> {
  let query = supabase
    .from('sih26044.questionnaire_submissions')
    .select('*')
    .eq('questionnaire_version_id', versionId)
    .eq('respondent_actor_id', actorId);

  if (opportunityId) {
    query = query.eq('opportunity_id', opportunityId);
  } else {
    query = query.is('opportunity_id', null);
  }

  const { data: submission } = await query.single();

  if (!submission) {
    return { submission: null, responses: [] };
  }

  const { data: responses } = await supabase
    .from('sih26044.questionnaire_responses')
    .select('*')
    .eq('submission_id', submission.id);

  return { submission, responses: responses || [] };
}

/**
 * List questionnaires for an organization
 */
export async function listOrganizationQuestionnaires(
  organizationId: string,
): Promise<Array<Questionnaire & { current_version?: QuestionnaireVersion }>> {
  const { data: questionnaires, error } = await supabase
    .from('sih26044.questionnaires')
    .select('*')
    .eq('owner_organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list questionnaires: ${error.message}`);
  }

  if (!questionnaires) return [];

  // Fetch current versions separately
  const result = await Promise.all(
    questionnaires.map(async (q) => {
      if (!q.current_version_id) return q;

      const { data: version } = await supabase
        .from('sih26044.questionnaire_versions')
        .select('*')
        .eq('id', q.current_version_id)
        .single();

      return { ...q, current_version: version || undefined };
    }),
  );

  return result;
}

/**
 * List submissions for a questionnaire (recruiter view)
 */
export async function listQuestionnaireSubmissions(
  questionnaireId: string,
): Promise<
  Array<
    QuestionnaireSubmission & {
      respondent?: { id: string; name: string };
    }
  >
> {
  const { data: submissions, error } = await supabase
    .from('sih26044.questionnaire_submissions')
    .select('*')
    .eq('questionnaire_version_id', questionnaireId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list submissions: ${error.message}`);
  }

  if (!submissions) return [];

  // Fetch respondent info separately
  const result = await Promise.all(
    submissions.map(async (sub) => {
      const { data: actor } = await supabase
        .from('sih26044.actors')
        .select('id, name')
        .eq('id', sub.respondent_actor_id)
        .single();

      return { ...sub, respondent: actor || undefined };
    }),
  );

  return result;
}
