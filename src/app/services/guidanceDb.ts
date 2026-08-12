// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Guidance System — Supabase CRUD Operations
// All typed CRUD for the six guidance tables
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase';
import type {
  CareerPassport,
  RecommendationSet,
  PathwayPlan,
} from '../engine/types';

// ─── Guidance Profile (Career Passport) ───────────────────────────────────────

interface DbGuidanceProfile {
  id: string;
  user_id: string;
  segment: string | null;
  passport: unknown;
  passport_version: number;
  updated_at: string;
}

export async function loadPassport(userId: string): Promise<CareerPassport | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('guidance_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('loadPassport error:', error);
    return null;
  }
  if (!data) return null;
  
  return (data as DbGuidanceProfile).passport as CareerPassport;
}

export async function savePassport(
  userId: string,
  passport: CareerPassport
): Promise<void> {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('guidance_profiles')
    .upsert({
      user_id: userId,
      segment: passport.segment,
      passport: passport as unknown as Record<string, unknown>,
      passport_version: passport.version,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
  
  if (error) {
    console.error('savePassport error:', error);
  }
}

// ─── Assessments ──────────────────────────────────────────────────────────────

interface DbAssessment {
  id: string;
  user_id: string;
  kind: string;
  result: unknown;
  taken_at: string;
}
export type { DbAssessment };

export async function saveAssessment(
  userId: string,
  kind: 'riasec' | 'aptitude' | 'values' | 'aspiration',
  result: unknown
): Promise<void> {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('guidance_assessments')
    .insert({
      user_id: userId,
      kind,
      result: result as Record<string, unknown>,
    });
  
  if (error) {
    console.error('saveAssessment error:', error);
  }
}

export async function fetchAssessments(userId: string): Promise<DbAssessment[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('guidance_assessments')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false });
  
  if (error) {
    console.error('fetchAssessments error:', error);
    return [];
  }
  
  return (data ?? []) as DbAssessment[];
}

// ─── Recommendations ──────────────────────────────────────────────────────────

interface DbRecommendation {
  id: string;
  user_id: string;
  passport_version: number;
  kb_version: string;
  result: unknown;
  created_at: string;
}
export type { DbRecommendation };

export async function saveRecommendationSet(
  userId: string,
  recommendationSet: RecommendationSet
): Promise<void> {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('guidance_recommendations')
    .insert({
      user_id: userId,
      passport_version: recommendationSet.passportVersion,
      kb_version: recommendationSet.kbVersion,
      result: recommendationSet as unknown as Record<string, unknown>,
    });
  
  if (error) {
    console.error('saveRecommendationSet error:', error);
  }
}

export async function fetchRecommendations(userId: string): Promise<DbRecommendation[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('guidance_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('fetchRecommendations error:', error);
    return [];
  }
  
  return (data ?? []) as DbRecommendation[];
}

// ─── Pathways ─────────────────────────────────────────────────────────────────

interface DbPathway {
  id: string;
  user_id: string;
  occupation_id: string;
  plan: unknown;
  status: string;
  created_at: string;
  updated_at: string;
}
export type { DbPathway };

export async function savePathway(
  userId: string,
  pathwayPlan: PathwayPlan
): Promise<void> {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('guidance_pathways')
    .insert({
      user_id: userId,
      occupation_id: pathwayPlan.occupationId,
      plan: pathwayPlan as unknown as Record<string, unknown>,
      status: 'active',
    });
  
  if (error) {
    console.error('savePathway error:', error);
  }
}

export async function updatePathway(
  pathwayId: string,
  updates: {
    plan?: PathwayPlan;
    status?: 'active' | 'completed' | 'archived';
  }
): Promise<void> {
  if (!supabase) return;
  
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.plan) {
    payload.plan = updates.plan as unknown as Record<string, unknown>;
  }
  if (updates.status) {
    payload.status = updates.status;
  }
  
  const { error } = await supabase
    .from('guidance_pathways')
    .update(payload)
    .eq('id', pathwayId);
  
  if (error) {
    console.error('updatePathway error:', error);
  }
}

export async function fetchPathways(userId: string): Promise<DbPathway[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('guidance_pathways')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('fetchPathways error:', error);
    return [];
  }
  
  return (data ?? []) as DbPathway[];
}

// ─── Progress Events ──────────────────────────────────────────────────────────

interface DbProgress {
  id: string;
  user_id: string;
  event_type: string;
  payload: unknown;
  created_at: string;
}
export type { DbProgress };

export async function logProgress(
  userId: string,
  eventType: 'skill_validated' | 'module_completed' | 'milestone_done' | 'profile_edit',
  payload: Record<string, unknown>
): Promise<void> {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('guidance_progress')
    .insert({
      user_id: userId,
      event_type: eventType,
      payload: payload as Record<string, unknown>,
    });
  
  if (error) {
    console.error('logProgress error:', error);
  }
}

export async function fetchProgress(userId: string, limit = 50): Promise<DbProgress[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('guidance_progress')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('fetchProgress error:', error);
    return [];
  }
  
  return (data ?? []) as DbProgress[];
}

// ─── Consents ─────────────────────────────────────────────────────────────────

interface DbConsent {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  detail: unknown;
  created_at: string;
}
export type { DbConsent };

export async function logConsent(
  userId: string,
  consentType: 'terms' | 'data_processing' | 'guardian' | 'cloud_history',
  granted: boolean,
  detail: Record<string, unknown> = {}
): Promise<void> {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('guidance_consents')
    .insert({
      user_id: userId,
      consent_type: consentType,
      granted,
      detail: detail as Record<string, unknown>,
    });
  
  if (error) {
    console.error('logConsent error:', error);
  }
}

export async function fetchConsents(userId: string): Promise<DbConsent[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('guidance_consents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('fetchConsents error:', error);
    return [];
  }
  
  return (data ?? []) as DbConsent[];
}

export async function deleteAllGuidanceData(userId: string): Promise<void> {
  if (!supabase) return;
  const tables = ['guidance_progress', 'guidance_pathways', 'guidance_recommendations', 'guidance_assessments', 'guidance_consents', 'guidance_profiles'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  }
}
