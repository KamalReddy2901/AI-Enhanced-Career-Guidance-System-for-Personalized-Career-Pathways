// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Knowledge Base — Validator
// Checks referential integrity and KB quality rules
// ══════════════════════════════════════════════════════════════════════════════

import { SKILLS, OCCUPATIONS, TRANSITIONS, QUALIFICATIONS, MARKET_SIGNALS } from './index';
import { skillById, occupationById } from './index';

export function validateKB(): string[] {
  const violations: string[] = [];

  // ═══ CHECK FOR DUPLICATE IDS ═════════════════════════════════════════════════
  const skillIds = new Set<string>();
  SKILLS.forEach(s => {
    if (skillIds.has(s.id)) {
      violations.push(`Duplicate skill ID: ${s.id}`);
    }
    skillIds.add(s.id);
  });

  const occIds = new Set<string>();
  OCCUPATIONS.forEach(o => {
    if (occIds.has(o.id)) {
      violations.push(`Duplicate occupation ID: ${o.id}`);
    }
    occIds.add(o.id);
  });

  const qualIds = new Set<string>();
  QUALIFICATIONS.forEach(q => {
    if (qualIds.has(q.id)) {
      violations.push(`Duplicate qualification ID: ${q.id}`);
    }
    qualIds.add(q.id);
  });

  // ═══ CHECK OCCUPATION REQUIREMENTS ═══════════════════════════════════════════
  OCCUPATIONS.forEach(occ => {
    // Check NCO code format
    if (!occ.ncoCode.match(/^\d{4}(\.\d{2,4})?$/)) {
      violations.push(`Occupation ${occ.id}: invalid NCO code format "${occ.ncoCode}"`);
    }

    // Check minimum skill count
    if (occ.skills.length < 6) {
      violations.push(`Occupation ${occ.id}: has only ${occ.skills.length} skills (minimum 6)`);
    }

    // Check skill references
    occ.skills.forEach(req => {
      if (!skillById.has(req.skillId)) {
        violations.push(`Occupation ${occ.id}: references unknown skill "${req.skillId}"`);
      }
    });

    // Check NSQF level range
    if (occ.nsqfEntryLevel < 1 || occ.nsqfEntryLevel > 10) {
      violations.push(`Occupation ${occ.id}: NSQF entry level ${occ.nsqfEntryLevel} out of range (1-10)`);
    }
  });

  // ═══ CHECK TRANSITIONS ═══════════════════════════════════════════════════════
  const occWithOutgoingEdges = new Set<string>();
  
  TRANSITIONS.forEach((t, idx) => {
    if (!occupationById.has(t.fromId)) {
      violations.push(`Transition ${idx}: fromId "${t.fromId}" not found in occupations`);
    } else {
      occWithOutgoingEdges.add(t.fromId);
    }
    
    if (!occupationById.has(t.toId)) {
      violations.push(`Transition ${idx}: toId "${t.toId}" not found in occupations`);
    }

    if (t.strength < 0 || t.strength > 1) {
      violations.push(`Transition ${idx}: strength ${t.strength} out of range (0-1)`);
    }

    if (t.typicalYears < 0 || t.typicalYears > 20) {
      violations.push(`Transition ${idx}: typicalYears ${t.typicalYears} seems unrealistic`);
    }
  });

  // Check every occupation has at least one outgoing transition
  OCCUPATIONS.forEach(occ => {
    if (!occWithOutgoingEdges.has(occ.id)) {
      violations.push(`Occupation ${occ.id}: has no outgoing transition edges`);
    }
  });

  // ═══ CHECK QUALIFICATIONS ═══════════════════════════════════════════════════
  const occReachableViaQual = new Set<string>();

  QUALIFICATIONS.forEach((q, idx) => {
    // Check skill references
    q.developsSkillIds.forEach(skillId => {
      if (!skillById.has(skillId)) {
        violations.push(`Qualification ${q.id}: develops unknown skill "${skillId}"`);
      }
    });

    // Check occupation references
    q.preparesForOccupationIds.forEach(occId => {
      if (!occupationById.has(occId)) {
        violations.push(`Qualification ${q.id}: prepares for unknown occupation "${occId}"`);
      } else {
        occReachableViaQual.add(occId);
      }
    });

    // Check NSQF level range
    if (q.nsqfLevel < 1 || q.nsqfLevel > 10) {
      violations.push(`Qualification ${q.id}: NSQF level ${q.nsqfLevel} out of range (1-10)`);
    }

    // Check reasonable duration
    if (q.typicalMonths < 1 || q.typicalMonths > 84) {
      violations.push(`Qualification ${q.id}: typicalMonths ${q.typicalMonths} seems unrealistic (1-84)`);
    }
  });

  // Check every occupation is reachable by at least one qualification
  OCCUPATIONS.forEach(occ => {
    if (!occReachableViaQual.has(occ.id)) {
      violations.push(`Occupation ${occ.id}: not reachable by any qualification`);
    }
  });

  // ═══ CHECK MARKET SIGNALS ════════════════════════════════════════════════════
  const occWithMarket = new Set<string>();

  MARKET_SIGNALS.forEach((m, idx) => {
    if (!occupationById.has(m.occupationId)) {
      violations.push(`Market signal ${idx}: occupationId "${m.occupationId}" not found`);
    } else {
      occWithMarket.add(m.occupationId);
    }

    if (m.demandIndex < 0 || m.demandIndex > 100) {
      violations.push(`Market signal for ${m.occupationId}: demandIndex ${m.demandIndex} out of range (0-100)`);
    }

    if (!['rising', 'stable', 'declining'].includes(m.growthTrend)) {
      violations.push(`Market signal for ${m.occupationId}: invalid growthTrend "${m.growthTrend}"`);
    }

    if (!m.observedPeriod || !m.source) {
      violations.push(`Market signal for ${m.occupationId}: missing observedPeriod or source`);
    }
  });

  // Check every occupation has a market signal
  OCCUPATIONS.forEach(occ => {
    if (!occWithMarket.has(occ.id)) {
      violations.push(`Occupation ${occ.id}: missing market signal`);
    }
  });

  return violations;
}

// ═══ AUTO-VALIDATE IN DEV MODE ═════════════════════════════════════════════════
if (import.meta.env?.DEV) {
  const violations = validateKB();
  if (violations.length > 0) {
    console.warn(`⚠️  KB Validation Violations (${violations.length}):`);
    violations.forEach(v => console.warn(`  - ${v}`));
  } else {
    console.log('✅ Knowledge Base validated: zero violations');
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('validate.ts')) {
  const violations = validateKB();
  console.log(JSON.stringify({
    skills: SKILLS.length,
    occupations: OCCUPATIONS.length,
    transitions: TRANSITIONS.length,
    qualifications: QUALIFICATIONS.length,
    marketSignals: MARKET_SIGNALS.length,
    vocationalEntryRoles: OCCUPATIONS.filter(o => o.isVocational || o.nsqfEntryLevel <= 5).length,
    violations,
  }, null, 2));
  if (violations.length) process.exitCode = 1;
}
