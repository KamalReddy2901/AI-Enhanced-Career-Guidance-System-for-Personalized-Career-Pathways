/**
 * CareerCase × SIH26044 — Questionnaire trusted operations (Worker)
 *
 * Handles server-side questionnaire lifecycle operations through trusted
 * SECURITY DEFINER RPCs. Provides:
 *
 * - Atomic questionnaire authoring (organization authority verified server-side)
 * - Explicit human publication (timestamp derived server-side)
 * - Deterministic submission finalization (scoring computed server-side)
 *
 * Browser-supplied actor/organization IDs are NEVER authoritative. All identity
 * resolution and authorization happens server-side via auth.uid() and RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Question definition for questionnaire creation
 */
export interface QuestionDefinition {
  question_type: 'single_choice' | 'multiple_choice' | 'numeric' | 'text' | 'structured_scenario';
  question_text: string;
  choice_options?: Array<{ value: string; label: string }>;
  numeric_min?: number;
  numeric_max?: number;
  skill_refs?: Array<{ skillId?: string; label: string }>;
  scoring_weight?: number;
}

/**
 * Create questionnaire request (browser → Worker)
 */
export interface CreateQuestionnaireRequest {
  organizationId: string;
  title: string;
  description: string;
  scopeDeclaration: 'opportunity_specific' | 'reusable_technical' | 'reusable_soft_skill';
  questions: QuestionDefinition[];
  scoringPolicy?: {
    version: string;
    rules: {
      method: string;
      max_score: number;
      bands?: Array<{
        min_score: number;
        max_score: number;
        label: string;
      }>;
    };
  } | null;
}

/**
 * Create questionnaire response
 */
export interface CreateQuestionnaireResponse {
  questionnaireId: string;
  versionId: string;
}

/**
 * Publish questionnaire request
 */
export interface PublishQuestionnaireRequest {
  versionId: string;
}

/**
 * Publish questionnaire response
 */
export interface PublishQuestionnaireResponse {
  questionnaireId: string;
  versionId: string;
  publishedAt: string;
}

/**
 * Submit questionnaire request
 */
export interface SubmitQuestionnaireRequest {
  submissionId: string;
}

/**
 * Submit questionnaire response
 */
export interface SubmitQuestionnaireResponse {
  submissionId: string;
  submittedAt: string;
  computedScore: number | null;
  maxScore: number | null;
}

/**
 * Create questionnaire with atomic authoring
 *
 * @param client - User-context Supabase client (with JWT)
 * @param request - Questionnaire creation request
 * @returns Questionnaire and version IDs
 */
export async function createQuestionnaireAtomic(
  client: SupabaseClient,
  request: CreateQuestionnaireRequest,
): Promise<CreateQuestionnaireResponse> {
  const { data, error } = await client.rpc('create_questionnaire_atomic', {
    p_organization_id: request.organizationId,
    p_title: request.title,
    p_description: request.description,
    p_scope_declaration: request.scopeDeclaration,
    p_questions: request.questions,
    p_scoring_policy: request.scoringPolicy || null,
  });

  if (error) {
    throw new Error(`Failed to create questionnaire: ${error.message} (${error.code})`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from create_questionnaire_atomic');
  }

  const result = data as { questionnaire_id: string; version_id: string };

  return {
    questionnaireId: result.questionnaire_id,
    versionId: result.version_id,
  };
}

/**
 * Publish questionnaire version
 *
 * @param client - User-context Supabase client (with JWT)
 * @param request - Publication request
 * @returns Publication result
 */
export async function publishQuestionnaireAtomic(
  client: SupabaseClient,
  request: PublishQuestionnaireRequest,
): Promise<PublishQuestionnaireResponse> {
  const { data, error } = await client.rpc('publish_questionnaire_atomic', {
    p_version_id: request.versionId,
  });

  if (error) {
    throw new Error(`Failed to publish questionnaire: ${error.message} (${error.code})`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from publish_questionnaire_atomic');
  }

  const result = data as {
    questionnaire_id: string;
    version_id: string;
    published_at: string;
  };

  return {
    questionnaireId: result.questionnaire_id,
    versionId: result.version_id,
    publishedAt: result.published_at,
  };
}

/**
 * Submit questionnaire (finalize with deterministic scoring)
 *
 * @param client - User-context Supabase client (with JWT)
 * @param request - Submission finalization request
 * @returns Submission result with computed score
 */
export async function submitQuestionnaireAtomic(
  client: SupabaseClient,
  request: SubmitQuestionnaireRequest,
): Promise<SubmitQuestionnaireResponse> {
  const { data, error } = await client.rpc('submit_questionnaire_atomic', {
    p_submission_id: request.submissionId,
  });

  if (error) {
    throw new Error(`Failed to submit questionnaire: ${error.message} (${error.code})`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response from submit_questionnaire_atomic');
  }

  const result = data as {
    submission_id: string;
    submitted_at: string;
    computed_score: number | null;
    max_score: number | null;
  };

  return {
    submissionId: result.submission_id,
    submittedAt: result.submitted_at,
    computedScore: result.computed_score,
    maxScore: result.max_score,
  };
}
