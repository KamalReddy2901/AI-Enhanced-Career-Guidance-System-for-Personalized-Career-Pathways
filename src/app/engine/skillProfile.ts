// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Skill Profile Engine — Evidence-based skill profile builder
// Maps resume/activity → canonical skills with confidence & evidence tracking
// ══════════════════════════════════════════════════════════════════════════════

import { skillById } from '../data/knowledge';
import type { SkillClaim, SkillEvidence, CareerPassport, Proficiency } from './types';

// ─── Resume Extraction → Canonical Skills ────────────────────────────────────

interface ExtractedSkill {
  name: string;
  proficiency: Proficiency;
  evidence: string;
}

export interface SkillMatchResult {
  matched: SkillClaim[];
  unmatched: string[];
}

/** Resolve a stable display label, including claims saved before custom-skill
 * names became a first-class field. */
export function skillClaimName(claim: SkillClaim): string {
  const canonical = skillById.get(claim.skillId)?.name;
  if (canonical) return canonical;
  if (claim.name?.trim()) return claim.name.trim();
  const legacy = claim.evidence
    .map(item => item.description.match(/^Manually added:\s*(.+)$/i)?.[1]?.trim())
    .find(Boolean);
  return legacy || 'Custom skill';
}

/** Offline fallback that emits only literal canonical-name or alias matches and
 * preserves the exact resume line as evidence. */
export function extractLiteralResumeSkills(resumeText: string): ExtractedSkill[] {
  const lines = resumeText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const extracted: ExtractedSkill[] = [];
  const ambiguousAliases = new Set(['planning','education','service','support','management','operations','training','instruction','security','finance','analysis','research']);
  for (const skill of skillById.values()) {
    const phrases = [skill.name, ...skill.aliases.filter(alias=>!ambiguousAliases.has(alias.toLowerCase()))].sort((a, b) => b.length - a.length);
    const evidence = lines.find(line => phrases.some(phrase => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(line);
    }));
    if (!evidence) continue;
    extracted.push({ name: skill.name, proficiency: 2, evidence });
    if (extracted.length === 25) break;
  }
  return extracted;
}

export function combineEvidenceConfidence(evidence: SkillEvidence[]): number {
  return Math.min(.97, 1 - evidence.reduce((product, item) => product * (1 - item.confidence), 1));
}

/**
 * Match extracted skill names → canonical skillIds
 * Uses case-insensitive name/alias matching
 * UPDATED: Auto-adds unmatched skills as custom skills (name field) instead of requiring manual confirmation
 */
export function matchSkillsToKB(extracted: ExtractedSkill[]): SkillMatchResult {
  const matched: SkillClaim[] = [];
  const unmatched: string[] = [];
  const normalize = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const makeClaim = (skillId: string, ex: ExtractedSkill, confidence: number): SkillClaim => ({
    skillId,
    proficiency: ex.proficiency,
    confidence,
    evidence: [{
      type: 'inferred_from_resume',
      description: ex.evidence,
      confidence,
      observedAt: new Date().toISOString(),
    }],
  });
  
  const makeCustomClaim = (ex: ExtractedSkill, confidence: number): SkillClaim => ({
    skillId: undefined!,  // No KB match
    name: ex.name,        // Preserve original extracted name
    proficiency: ex.proficiency,
    confidence,
    evidence: [{
      type: 'inferred_from_resume',
      description: ex.evidence,
      confidence,
      observedAt: new Date().toISOString(),
    }],
  });

  for (const ex of extracted) {
    const normalized = normalize(ex.name);
    if (!normalized) continue;
    
    // Try exact match first
    const exact = [...skillById].find(([, skill]) =>
      [skill.name, ...skill.aliases].some(alias => normalize(alias) === normalized),
    );
    if (exact) {
      matched.push(makeClaim(exact[0], ex, .72));
      continue;
    }
    
    // Try partial match
    let found = false;
    for (const [skillId, skill] of skillById) {
      const nameLower = normalize(skill.name);
      const tokens = normalized.split(/\s+/);
      const skillTokens = nameLower.split(/\s+/);
      // A partial match is only safe when it contains a meaningful token. This
      // avoids mapping a one-letter language such as "C" to arbitrary skills.
      if (tokens.some(token => token.length >= 4 && skillTokens.includes(token))) {
        matched.push(makeClaim(skillId, ex, .5));
        found = true;
        break;
      }
    }

    // NEW: If no KB match found, auto-add as custom skill with lower confidence
    if (!found) {
      matched.push(makeCustomClaim(ex, .6));  // 0.6 confidence for custom skills
      unmatched.push(ex.name);  // Still track for UI display (informational only)
    }
  }

  return { matched, unmatched: [...new Set(unmatched)] };
}

/**
 * Merge new skill claims into existing passport skills
 * - If skill exists: append evidence, update proficiency if higher
 * - If new: add claim
 */
export function mergeSkillClaims(
  existing: SkillClaim[],
  newClaims: SkillClaim[]
): SkillClaim[] {
  const skillMap = new Map<string, SkillClaim>();

  // Start with existing
  existing.forEach(claim => {
    skillMap.set(claim.skillId, { ...claim });
  });

  // Merge new claims
  newClaims.forEach(newClaim => {
    const existing = skillMap.get(newClaim.skillId);
    if (existing) {
      // Append evidence
      existing.evidence.push(...newClaim.evidence);
      // Update proficiency if higher
      if (newClaim.proficiency > existing.proficiency) {
        existing.proficiency = newClaim.proficiency;
      }
      existing.confidence = combineEvidenceConfidence(existing.evidence);
    } else {
      skillMap.set(newClaim.skillId, newClaim);
    }
  });

  return Array.from(skillMap.values());
}

/**
 * Add validation evidence to a skill claim (from assessment or self-rating)
 */
export function addSkillEvidence(
  claim: SkillClaim,
  evidence: SkillEvidence
): SkillClaim {
  return {
    ...claim,
    evidence: [...claim.evidence, evidence],
    confidence: combineEvidenceConfidence([...claim.evidence, evidence]),
  };
}

// ─── Passport Completeness Calculation ───────────────────────────────────────

export type PassportCompletenessSectionId =
  | 'basics'
  | 'skills'
  | 'interests'
  | 'aptitude'
  | 'values'
  | 'aspiration';

export interface PassportCompletenessSection {
  id: PassportCompletenessSectionId;
  score: number;
  maximum: number;
  complete: boolean;
  path: string;
}

/**
 * The single source of truth for passport readiness. Keep the breakdown and
 * total together so every surface shows the same number and next action.
 */
export function getPassportCompletenessBreakdown(
  passport: CareerPassport,
): PassportCompletenessSection[] {
  const constraints = passport.constraints;
  const basicsScore =
    (passport.segment ? 5 : 0) +
    (passport.education?.level ? 5 : 0) +
    (constraints?.location.trim() ? 2 : 0) +
    (constraints?.languages.length ? 3 : 0) +
    (constraints?.weeklyLearningHours > 0 ? 5 : 0);
  const skillCount = passport.skills.length;
  const skillsScore = skillCount >= 10 ? 20 : skillCount >= 5 ? 15 : skillCount > 0 ? 10 : 0;
  const aspirationScore = passport.aspiration
    ? 10 + (passport.aspiration.dreamOccupationIds.length > 0 ? 5 : 0)
    : 0;

  const section = (
    id: PassportCompletenessSectionId,
    score: number,
    maximum: number,
    path: string,
  ): PassportCompletenessSection => ({
    id,
    score,
    maximum,
    complete: score === maximum,
    path,
  });

  return [
    section('basics', basicsScore, 20, '/passport'),
    section('skills', skillsScore, 20, '/passport'),
    section('interests', passport.riasec ? 20 : 0, 20, '/assess/interests'),
    section('aptitude', passport.aptitude ? 15 : 0, 15, '/assess/aptitude'),
    section('values', passport.values ? 10 : 0, 10, '/assess/values'),
    section('aspiration', aspirationScore, 15, '/assess/aspirations'),
  ];
}

/** Calculate passport completeness (0-100) from the canonical breakdown. */
export function calculateCompleteness(passport: CareerPassport): number {
  return getPassportCompletenessBreakdown(passport).reduce(
    (total, item) => total + item.score,
    0,
  );
}

/**
 * Estimate NSQF level from education
 */
export function estimateNSQFLevel(education: CareerPassport['education']): number {
  const levelMap: Record<string, number> = {
    'below_10': 1,
    'class_10': 4,
    'class_12': 4,
    'iti_diploma': 5,
    'undergraduate': 6,
    'postgraduate': 7,
  };
  return levelMap[education.level] || 4;
}

/**
 * Group skills by category for display
 */
export function groupSkillsByCategory(
  claims: SkillClaim[]
): Record<string, SkillClaim[]> {
  const groups: Record<string, SkillClaim[]> = {
    technical: [],
    cognitive: [],
    interpersonal: [],
    domain: [],
    tool: [],
    language: [],
    custom: [],
  };

  claims.forEach(claim => {
    const skill = skillById.get(claim.skillId);
    if (skill) {
      if (!groups[skill.category]) {
        groups[skill.category] = [];
      }
      groups[skill.category].push(claim);
    } else {
      // User-supplied skills are still valid profile evidence even when the
      // canonical taxonomy has no equivalent. Keep them visible and editable.
      groups.custom.push(claim);
    }
  });

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(groups).filter(([_, skills]) => skills.length > 0)
  );
}
