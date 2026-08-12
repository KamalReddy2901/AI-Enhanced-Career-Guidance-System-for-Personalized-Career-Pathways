// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Knowledge Base — Main Index & Loaders
// ══════════════════════════════════════════════════════════════════════════════

import { SKILLS } from './skills';
import { OCCUPATIONS } from './occupations';
import { TRANSITIONS } from './transitions';
import { QUALIFICATIONS } from './qualifications';
import { MARKET_SIGNALS } from './market';
import type { Skill, Occupation, TransitionEdge, Qualification, MarketSignal } from './schema';

export const KB_VERSION = 'kb-2026.06.1';
export const KB_LICENSE_NOTE = 'Curated demonstration dataset grounded in NCO-2015 codes and NSQF levels. Demand figures are indicative snapshots, not live statistics.';

// ═══ EXPORTS ═══════════════════════════════════════════════════════════════════
export { SKILLS, OCCUPATIONS, TRANSITIONS, QUALIFICATIONS, MARKET_SIGNALS };
export * from './schema';

// ═══ LOOKUP MAPS (built once at module load) ═══════════════════════════════════
export const skillById = new Map<string, Skill>();
SKILLS.forEach(s => skillById.set(s.id, s));

export const occupationById = new Map<string, Occupation>();
OCCUPATIONS.forEach(o => occupationById.set(o.id, o));

export const qualificationById = new Map<string, Qualification>();
QUALIFICATIONS.forEach(q => qualificationById.set(q.id, q));

export const marketById = new Map<string, MarketSignal>();
MARKET_SIGNALS.forEach(m => marketById.set(m.occupationId, m));

// ═══ TRANSITION LOOKUPS ════════════════════════════════════════════════════════
const transitionsFromMap = new Map<string, TransitionEdge[]>();
const transitionsToMap = new Map<string, TransitionEdge[]>();

TRANSITIONS.forEach(t => {
  if (!transitionsFromMap.has(t.fromId)) {
    transitionsFromMap.set(t.fromId, []);
  }
  transitionsFromMap.get(t.fromId)!.push(t);

  if (!transitionsToMap.has(t.toId)) {
    transitionsToMap.set(t.toId, []);
  }
  transitionsToMap.get(t.toId)!.push(t);
});

export function transitionsFrom(occupationId: string): TransitionEdge[] {
  return transitionsFromMap.get(occupationId) || [];
}

export function transitionsTo(occupationId: string): TransitionEdge[] {
  return transitionsToMap.get(occupationId) || [];
}

// ═══ QUALIFICATION LOOKUPS ═════════════════════════════════════════════════════
const qualsByOccupation = new Map<string, Qualification[]>();
const qualsBySkill = new Map<string, Qualification[]>();

QUALIFICATIONS.forEach(q => {
  q.preparesForOccupationIds.forEach(occId => {
    if (!qualsByOccupation.has(occId)) {
      qualsByOccupation.set(occId, []);
    }
    qualsByOccupation.get(occId)!.push(q);
  });

  q.developsSkillIds.forEach(skillId => {
    if (!qualsBySkill.has(skillId)) {
      qualsBySkill.set(skillId, []);
    }
    qualsBySkill.get(skillId)!.push(q);
  });
});

export function qualificationsForOccupation(occupationId: string): Qualification[] {
  return qualsByOccupation.get(occupationId) || [];
}

export function qualificationsForSkill(skillId: string): Qualification[] {
  return qualsBySkill.get(skillId) || [];
}

export function marketFor(occupationId: string): MarketSignal | undefined {
  return marketById.get(occupationId);
}

// ═══ KB STATS (helpful for QA) ═════════════════════════════════════════════════
export const KB_STATS = {
  skills: SKILLS.length,
  occupations: OCCUPATIONS.length,
  transitions: TRANSITIONS.length,
  qualifications: QUALIFICATIONS.length,
  marketSignals: MARKET_SIGNALS.length,
  version: KB_VERSION,
};
