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

const ASSESSMENT_STORAGE_KEY = 'cc_guidance_assessment_runs';
const PROGRESS_STORAGE_KEY = 'cc_guidance_progress_events';
const PASSPORT_STORAGE_KEY = 'cc_guidance_passport';
const RECOMMENDATIONS_STORAGE_KEY = 'cc_guidance_recommendations';
const PATHWAYS_STORAGE_KEY = 'cc_guidance_pathways';
const CONSENTS_STORAGE_KEY = 'cc_guidance_consents';

interface LocalAssessmentRun {
  id: string;
  kind: 'riasec' | 'aptitude' | 'values' | 'aspiration';
  result: unknown;
  takenAt: string;
}

interface LocalProgressEvent {
  id: string;
  eventType: 'skill_validated' | 'module_completed' | 'milestone_done' | 'profile_edit' | 'skill_discovery_completed';
  payload: Record<string, unknown>;
  createdAt: string;
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T; } catch { return fallback; }
}

function writeLocal(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function localEventId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergePathwayProgress(local: PathwayPlan, remote: PathwayPlan): PathwayPlan {
  return {
    ...local,
    chosenRoute: local.chosenRoute ?? remote.chosenRoute,
    routes: local.routes.map(route => {
      const remoteRoute = remote.routes.find(candidate => candidate.kind === route.kind);
      return {
        ...route,
        steps: route.steps.map(step => ({
          ...step,
          done: step.done || Boolean(remoteRoute?.steps.some(remoteStep => remoteStep.done && remoteStep.kind === step.kind && remoteStep.refId === step.refId && remoteStep.label === step.label)),
        })),
      };
    }),
  };
}

export interface GuidanceMigrationReport {
  passport: CareerPassport | null;
  pathways: PathwayPlan[];
  uploaded: { passport: number; assessments: number; recommendations: number; pathways: number; progress: number; consents: number };
}

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
  userId: string | null,
  kind: 'riasec' | 'aptitude' | 'values' | 'aspiration',
  result: unknown
): Promise<void> {
  const run: LocalAssessmentRun = { id: localEventId(), kind, result, takenAt: new Date().toISOString() };
  writeLocal(ASSESSMENT_STORAGE_KEY, [...readLocal<LocalAssessmentRun[]>(ASSESSMENT_STORAGE_KEY, []), run]);
  if (!supabase || !userId) return;
  
  const { error } = await supabase
    .from('guidance_assessments')
    .insert({
      user_id: userId,
      kind,
      result: { ...(result as Record<string, unknown>), _localEventId: run.id },
      taken_at: run.takenAt,
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
  
  const { data: existing, error: lookupError } = await supabase
    .from('guidance_pathways')
    .select('id')
    .eq('user_id', userId)
    .eq('occupation_id', pathwayPlan.occupationId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) { console.error('savePathway lookup error:', lookupError); return; }
  const query = existing
    ? supabase.from('guidance_pathways').update({ plan: pathwayPlan as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : supabase.from('guidance_pathways').insert({ user_id: userId, occupation_id: pathwayPlan.occupationId, plan: pathwayPlan as unknown as Record<string, unknown>, status: 'active' });
  const { error } = await query;
  
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
  userId: string | null,
  eventType: 'skill_validated' | 'module_completed' | 'milestone_done' | 'profile_edit' | 'skill_discovery_completed',
  payload: Record<string, unknown>
): Promise<void> {
  const event: LocalProgressEvent = { id: localEventId(), eventType, payload, createdAt: new Date().toISOString() };
  writeLocal(PROGRESS_STORAGE_KEY, [...readLocal<LocalProgressEvent[]>(PROGRESS_STORAGE_KEY, []), event]);
  if (!supabase || !userId) return;
  
  const { error } = await supabase
    .from('guidance_progress')
    .insert({
      user_id: userId,
      event_type: eventType,
      payload: { ...payload, _localEventId: event.id },
      created_at: event.createdAt,
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

/** Lossless one-time handoff from the anonymous browser ledger to the user's cloud ledger. */
export async function migrateLocalGuidanceToCloud(userId: string): Promise<GuidanceMigrationReport> {
  const localPassport = readLocal<CareerPassport | null>(PASSPORT_STORAGE_KEY, null);
  const localPathways = readLocal<PathwayPlan[]>(PATHWAYS_STORAGE_KEY, []);
  const localRecommendations = readLocal<RecommendationSet | null>(RECOMMENDATIONS_STORAGE_KEY, null);
  const storedAssessments = readLocal<LocalAssessmentRun[]>(ASSESSMENT_STORAGE_KEY, []);
  const localAssessments: LocalAssessmentRun[] = storedAssessments.length || !localPassport ? storedAssessments : [
    ...(localPassport.riasec ? [{ id: `passport-v${localPassport.version}-riasec`, kind: 'riasec' as const, result: { scores: localPassport.riasec }, takenAt: localPassport.updatedAt }] : []),
    ...(localPassport.aptitude ? [{ id: `passport-v${localPassport.version}-aptitude`, kind: 'aptitude' as const, result: { scores: localPassport.aptitude }, takenAt: localPassport.updatedAt }] : []),
    ...(localPassport.values ? [{ id: `passport-v${localPassport.version}-values`, kind: 'values' as const, result: localPassport.values, takenAt: localPassport.updatedAt }] : []),
    ...(localPassport.aspiration ? [{ id: `passport-v${localPassport.version}-aspiration`, kind: 'aspiration' as const, result: localPassport.aspiration, takenAt: localPassport.updatedAt }] : []),
  ];
  if (!storedAssessments.length && localAssessments.length) writeLocal(ASSESSMENT_STORAGE_KEY, localAssessments);
  const localProgress = readLocal<LocalProgressEvent[]>(PROGRESS_STORAGE_KEY, []);
  const localConsents = readLocal<Array<{ consent_type: string; granted: boolean; detail?: Record<string, unknown>; created_at?: string }>>(CONSENTS_STORAGE_KEY, []);
  const uploaded = { passport: 0, assessments: 0, recommendations: 0, pathways: 0, progress: 0, consents: 0 };
  if (!supabase) return { passport: localPassport, pathways: localPathways, uploaded };

  const [profileResult, assessmentResult, recommendationResult, pathwayResult, progressResult, consentResult] = await Promise.all([
    supabase.from('guidance_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('guidance_assessments').select('*').eq('user_id', userId),
    supabase.from('guidance_recommendations').select('*').eq('user_id', userId),
    supabase.from('guidance_pathways').select('*').eq('user_id', userId).eq('status', 'active'),
    supabase.from('guidance_progress').select('*').eq('user_id', userId),
    supabase.from('guidance_consents').select('*').eq('user_id', userId),
  ]);
  const failed = [profileResult, assessmentResult, recommendationResult, pathwayResult, progressResult, consentResult].find(result => result.error);
  if (failed?.error) throw failed.error;

  const remotePassport = profileResult.data ? (profileResult.data as DbGuidanceProfile).passport as CareerPassport : null;
  const localTime = localPassport ? new Date(localPassport.updatedAt).getTime() || 0 : 0;
  const remoteTime = remotePassport ? new Date(remotePassport.updatedAt).getTime() || 0 : 0;
  const mergedPassport = localTime >= remoteTime ? localPassport : remotePassport;
  if (localPassport && localTime >= remoteTime) {
    const { error } = await supabase.from('guidance_profiles').upsert({ user_id: userId, segment: localPassport.segment, passport: localPassport as unknown as Record<string, unknown>, passport_version: localPassport.version, updated_at: localPassport.updatedAt }, { onConflict: 'user_id' });
    if (error) throw error;
    uploaded.passport = 1;
  }
  if (mergedPassport) writeLocal(PASSPORT_STORAGE_KEY, mergedPassport);

  const remoteAssessmentIds = new Set(((assessmentResult.data ?? []) as DbAssessment[]).map(row => (row.result as Record<string, unknown>)?._localEventId).filter(Boolean));
  for (const run of localAssessments.filter(run => !remoteAssessmentIds.has(run.id))) {
    const { error } = await supabase.from('guidance_assessments').insert({ user_id: userId, kind: run.kind, result: { ...(run.result as Record<string, unknown>), _localEventId: run.id }, taken_at: run.takenAt });
    if (error) throw error;
    uploaded.assessments++;
  }

  const remoteRecommendations = (recommendationResult.data ?? []) as DbRecommendation[];
  if (localRecommendations && !remoteRecommendations.some(row => row.passport_version === localRecommendations.passportVersion && row.kb_version === localRecommendations.kbVersion)) {
    const { error } = await supabase.from('guidance_recommendations').insert({ user_id: userId, passport_version: localRecommendations.passportVersion, kb_version: localRecommendations.kbVersion, result: localRecommendations as unknown as Record<string, unknown> });
    if (error) throw error;
    uploaded.recommendations = 1;
  }

  const remotePathways = (pathwayResult.data ?? []) as DbPathway[];
  const mergedPathways = new Map<string, PathwayPlan>();
  remotePathways.forEach(row => mergedPathways.set(row.occupation_id, row.plan as PathwayPlan));
  for (const localPlan of localPathways) {
    const remoteRow = remotePathways.find(row => row.occupation_id === localPlan.occupationId);
    const merged = remoteRow ? mergePathwayProgress(localPlan, remoteRow.plan as PathwayPlan) : localPlan;
    mergedPathways.set(localPlan.occupationId, merged);
    const query = remoteRow
      ? supabase.from('guidance_pathways').update({ plan: merged as unknown as Record<string, unknown>, updated_at: new Date().toISOString() }).eq('id', remoteRow.id)
      : supabase.from('guidance_pathways').insert({ user_id: userId, occupation_id: merged.occupationId, plan: merged as unknown as Record<string, unknown>, status: 'active' });
    const { error } = await query;
    if (error) throw error;
    uploaded.pathways++;
  }
  writeLocal(PATHWAYS_STORAGE_KEY, [...mergedPathways.values()]);

  const remoteProgressIds = new Set(((progressResult.data ?? []) as DbProgress[]).map(row => (row.payload as Record<string, unknown>)?._localEventId).filter(Boolean));
  for (const event of localProgress.filter(event => !remoteProgressIds.has(event.id))) {
    const { error } = await supabase.from('guidance_progress').insert({ user_id: userId, event_type: event.eventType, payload: { ...event.payload, _localEventId: event.id }, created_at: event.createdAt });
    if (error) throw error;
    uploaded.progress++;
  }

  const remoteConsentIds = new Set(((consentResult.data ?? []) as DbConsent[]).map(row => (row.detail as Record<string, unknown>)?._localEventId).filter(Boolean));
  for (const consent of localConsents) {
    const id = `${consent.consent_type}:${consent.created_at ?? 'undated'}`;
    if (remoteConsentIds.has(id)) continue;
    const { error } = await supabase.from('guidance_consents').insert({ user_id: userId, consent_type: consent.consent_type, granted: consent.granted, detail: { ...(consent.detail ?? {}), _localEventId: id }, created_at: consent.created_at ?? new Date().toISOString() });
    if (error) throw error;
    uploaded.consents++;
  }

  return { passport: mergedPassport, pathways: [...mergedPathways.values()], uploaded };
}

export async function deleteAllGuidanceData(userId: string): Promise<void> {
  if (!supabase) return;
  const tables = ['guidance_progress', 'guidance_pathways', 'guidance_recommendations', 'guidance_assessments', 'guidance_consents', 'guidance_profiles'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  }
}
