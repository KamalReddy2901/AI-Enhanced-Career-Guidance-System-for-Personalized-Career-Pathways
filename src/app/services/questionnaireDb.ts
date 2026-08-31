/**
 * CareerCase × SIH26044 — Questionnaire service (Worker-backed trusted operations).
 *
 * Critical authority changes from PR #44:
 * - Questionnaire authoring: now atomic trusted RPC via Worker (not browser multi-step)
 * - Publication: now explicit trusted human action via Worker (not direct browser UPDATE)
 * - Submission finalization: now deterministic server-side scoring via Worker (not browser-computed)
 * - Actor/organization authority: resolved server-side from auth.uid() (not browser-supplied)
 *
 * Read operations remain browser RLS where appropriate.
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
} from '../types/questionnaire';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const workerUrl = import.meta.env.VITE_WORKER_URL || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get authenticated session token for Worker requests
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session.access_token;
}

/**
 * Create a new questionnaire (atomic trusted operation via Worker)
 */
export async function createQuestionnaire(
  formData: QuestionnaireFormData,
  organizationId: string, // Browser supplies but Worker verifies authority server-side
): Promise<{ questionnaire: { id: string }; version: { id: string } }> {
  const token = await getAuthToken();

  const response = await fetch(`${workerUrl}/sih/questionnaires/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      organizationId,
      title: formData.title,
      description: formData.description,
      scopeDeclaration: formData.scope_declaration,
      questions: formData.questions,
      scoringPolicy: formData.scoring_policy || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Failed to create questionnaire: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();

  return {
    questionnaire: { id: result.questionnaireId },
    version: { id: result.versionId },
  };
}

/**
 * Publish a questionnaire version (trusted operation via Worker)
 */
export async function publishQuestionnaireVersion(
  versionId: string,
): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(`${workerUrl}/sih/questionnaires/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ versionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Failed to publish questionnaire: ${error.error?.message || response.statusText}`);
  }
}

export async function createQuestionnaireSuccessor(
  sourceVersionId: string,
): Promise<{ successorVersionId: string; versionNumber: number }> {
  const token = await getAuthToken();
  const response = await fetch(`${workerUrl}/sih/questionnaires/successor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ sourceVersionId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Failed to create successor draft: ${error.error?.message || response.statusText}`);
  }
  const result = await response.json();
  return { successorVersionId: result.successorVersionId, versionNumber: result.versionNumber };
}

export async function updateQuestionnaireDraft(
  versionId: string,
  formData: QuestionnaireFormData,
): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${workerUrl}/sih/questionnaires/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      versionId,
      title: formData.title,
      description: formData.description,
      scopeDeclaration: formData.scope_declaration,
      questions: formData.questions,
      scoringPolicy: formData.scoring_policy || null,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Failed to update questionnaire draft: ${error.error?.message || response.statusText}`);
  }
}

/**
 * Fetch questionnaire version with questions (browser RLS read)
 */
export async function getQuestionnaireVersion(
  versionId: string,
): Promise<{
  version: QuestionnaireVersion;
  questions: QuestionnaireQuestion[];
}> {
  const { data: version, error: vError } = await supabase
    .schema('sih26044').from('questionnaire_versions')
    .select('id, questionnaire_id, version_number, status, title, description, scope_declaration, scoring_policy, created_by_actor_id, created_at, published_at')
    .eq('id', versionId)
    .single();

  if (vError || !version) {
    throw new Error(`Failed to fetch questionnaire version: ${vError?.message}`);
  }

  const { data: questions, error: qError } = await supabase
    .schema('sih26044').from('questionnaire_questions')
    .select('id, questionnaire_version_id, ordinal, question_type, question_text, choice_options, numeric_min, numeric_max, skill_refs, scoring_weight, created_at')
    .eq('questionnaire_version_id', versionId)
    .order('ordinal');

  if (qError) {
    throw new Error(`Failed to fetch questions: ${qError.message}`);
  }

  return { version: version as QuestionnaireVersion, questions: (questions || []) as QuestionnaireQuestion[] };
}

/**
 * Assign questionnaire to opportunity (browser RLS write)
 */
export async function assignQuestionnaireToOpportunity(
  opportunityVersionId: string,
  questionnaireVersionId: string,
  required: boolean,
  ordinal: number,
): Promise<OpportunityQuestionnaireAssignment> {
  const token = await getAuthToken();
  const response = await fetch(`${workerUrl}/sih/questionnaires/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ opportunityVersionId, questionnaireVersionId, required, ordinal }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Failed to attach questionnaire: ${error.error?.message || response.statusText}`);
  }
  const result = await response.json();
  const { data, error } = await supabase.schema('sih26044')
    .from('opportunity_questionnaire_assignments')
    .select('id, opportunity_version_id, questionnaire_id, questionnaire_version_id, required, ordinal, created_at')
    .eq('id', result.assignmentId).single();
  if (error || !data) throw new Error(`Failed to read questionnaire attachment: ${error?.message}`);
  return data as OpportunityQuestionnaireAssignment;
}

export async function listDraftOpportunityVersionsForQuestionnaire(
  questionnaireId: string,
): Promise<Array<{ id: string; title: string; versionNumber: number }>> {
  const { data: questionnaire, error: questionnaireError } = await supabase
    .schema('sih26044').from('questionnaires')
    .select('id, owner_organization_id').eq('id', questionnaireId).single();
  if (questionnaireError || !questionnaire) throw new Error(`Failed to resolve questionnaire owner: ${questionnaireError?.message}`);

  const { data: opportunities, error: opportunitiesError } = await supabase
    .schema('sih26044').from('opportunities')
    .select('id').eq('owner_organization_id', questionnaire.owner_organization_id);
  if (opportunitiesError) throw new Error(`Failed to list attachable opportunities: ${opportunitiesError.message}`);
  const opportunityIds = (opportunities || []).map((row) => row.id);
  if (opportunityIds.length === 0) return [];

  const { data: versions, error: versionsError } = await supabase
    .schema('sih26044').from('opportunity_versions')
    .select('id, title, version_number').in('opportunity_id', opportunityIds)
    .eq('status', 'draft').order('created_at', { ascending: false });
  if (versionsError) throw new Error(`Failed to list draft opportunity versions: ${versionsError.message}`);
  return (versions || []).map((row) => ({ id: row.id, title: row.title, versionNumber: row.version_number }));
}

export async function getOpportunityQuestionnaireAssignment(
  opportunityVersionId: string,
): Promise<(OpportunityQuestionnaireAssignment & { version: QuestionnaireVersion }) | null> {
  const { data: assignment, error } = await supabase.schema('sih26044')
    .from('opportunity_questionnaire_assignments')
    .select('id, opportunity_version_id, questionnaire_id, questionnaire_version_id, required, ordinal, created_at')
    .eq('opportunity_version_id', opportunityVersionId).order('ordinal').limit(1).maybeSingle();
  if (error) throw new Error(`Failed to load questionnaire requirement: ${error.message}`);
  if (!assignment) return null;
  const { data: version, error: versionError } = await supabase.schema('sih26044')
    .from('questionnaire_versions')
    .select('id, questionnaire_id, version_number, status, title, description, scope_declaration, scoring_policy, created_by_actor_id, created_at, published_at')
    .eq('id', assignment.questionnaire_version_id).single();
  if (versionError || !version) throw new Error(`Failed to load assigned questionnaire version: ${versionError?.message}`);
  return { ...(assignment as OpportunityQuestionnaireAssignment), version: version as QuestionnaireVersion };
}

/**
 * Start a new submission (browser RLS write)
 */
export async function startSubmission(
  versionId: string,
  actorId: string, // Browser supplies but RLS verifies ownership
  opportunityId?: string,
  opportunityVersionId?: string,
): Promise<QuestionnaireSubmission> {
  const { data, error } = await supabase
    .schema('sih26044').from('questionnaire_submissions')
    .insert({
      questionnaire_version_id: versionId,
      respondent_actor_id: actorId,
      opportunity_id: opportunityId || null,
      opportunity_version_id: opportunityVersionId || null,
    })
    .select('id, questionnaire_version_id, respondent_actor_id, opportunity_id, opportunity_version_id, started_at, submitted_at, computed_score, score_computed_at, scoring_policy_version, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to start submission: ${error?.message}`);
  }

  return data as QuestionnaireSubmission;
}

/**
 * Save a response (browser RLS write for draft submissions only)
 */
export async function saveResponse(
  submissionId: string,
  questionId: string,
  responseValue: QuestionnaireResponse['response_value'],
): Promise<QuestionnaireResponse> {
  const { data, error } = await supabase
    .schema('sih26044').from('questionnaire_responses')
    .upsert(
      {
        submission_id: submissionId,
        question_id: questionId,
        response_value: responseValue,
        // response_score is NOT set by browser - server derives it during finalization
      },
      {
        onConflict: 'submission_id,question_id',
      },
    )
    .select('id, submission_id, question_id, response_value, response_score, answered_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save response: ${error?.message}`);
  }

  return data as QuestionnaireResponse;
}

/**
 * Submit questionnaire (finalize submission with deterministic scoring via Worker)
 */
export async function submitQuestionnaire(
  submissionId: string,
): Promise<QuestionnaireSubmission> {
  const token = await getAuthToken();

  const response = await fetch(`${workerUrl}/sih/questionnaires/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ submissionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`Failed to submit questionnaire: ${error.error?.message || response.statusText}`);
  }

  const result = await response.json();

  // Fetch full submission after finalization
  const { data: submission, error: fetchError } = await supabase
    .schema('sih26044').from('questionnaire_submissions')
    .select('id, questionnaire_version_id, respondent_actor_id, opportunity_id, opportunity_version_id, started_at, submitted_at, computed_score, score_computed_at, scoring_policy_version, created_at, updated_at')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    throw new Error(`Failed to fetch finalized submission: ${fetchError?.message}`);
  }

  return submission as QuestionnaireSubmission;
}

/**
 * Get student's submission for a questionnaire (browser RLS read)
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
    .schema('sih26044').from('questionnaire_submissions')
    .select('id, questionnaire_version_id, respondent_actor_id, opportunity_id, opportunity_version_id, started_at, submitted_at, computed_score, score_computed_at, scoring_policy_version, created_at, updated_at')
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
    .schema('sih26044').from('questionnaire_responses')
    .select('id, submission_id, question_id, response_value, response_score, answered_at')
    .eq('submission_id', submission.id);

  return {
    submission: submission as QuestionnaireSubmission,
    responses: (responses || []) as QuestionnaireResponse[],
  };
}

/**
 * List questionnaires for an organization (browser RLS read)
 */
export async function listOrganizationQuestionnaires(
  organizationId: string,
): Promise<Array<Questionnaire & { current_version?: QuestionnaireVersion }>> {
  const { data: questionnaires, error } = await supabase
    .schema('sih26044').from('questionnaires')
    .select('id, owner_organization_id, current_version_id, status, created_by_actor_id, created_at, updated_at')
    .eq('owner_organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list questionnaires: ${error.message}`);
  }

  if (!questionnaires) return [];

  // Fetch current versions separately
  const result = await Promise.all(
    questionnaires.map(async (q) => {
      if (!q.current_version_id) return q as Questionnaire;

      const { data: version } = await supabase
        .schema('sih26044').from('questionnaire_versions')
        .select('id, questionnaire_id, version_number, status, title, description, scope_declaration, scoring_policy, created_by_actor_id, created_at, published_at')
        .eq('id', q.current_version_id)
        .single();

      return { ...q, current_version: version || undefined } as Questionnaire & { current_version?: QuestionnaireVersion };
    }),
  );

  return result;
}

/**
 * List submissions for a questionnaire (recruiter view - browser RLS read)
 */
export async function listQuestionnaireSubmissions(
  questionnaireVersionId: string, // Fixed: was incorrectly named in original
): Promise<
  Array<
    QuestionnaireSubmission & {
      respondent?: { id: string; display_name: string }; // Fixed: actors.display_name not .name
    }
  >
> {
  const { data: submissions, error } = await supabase
    .schema('sih26044').from('questionnaire_submissions')
    .select('id, questionnaire_version_id, respondent_actor_id, opportunity_id, opportunity_version_id, started_at, submitted_at, computed_score, score_computed_at, scoring_policy_version, created_at, updated_at')
    .eq('questionnaire_version_id', questionnaireVersionId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list submissions: ${error.message}`);
  }

  if (!submissions) return [];

  // Fetch respondent info separately
  const result = await Promise.all(
    submissions.map(async (sub) => {
      const { data: actor } = await supabase
        .schema('sih26044').from('actors')
        .select('id, display_name')
        .eq('id', sub.respondent_actor_id)
        .single();

      return { ...sub, respondent: actor || undefined } as QuestionnaireSubmission & { respondent?: { id: string; display_name: string } };
    }),
  );

  return result;
}
