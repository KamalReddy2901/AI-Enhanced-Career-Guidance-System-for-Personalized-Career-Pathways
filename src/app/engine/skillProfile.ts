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

/**
 * Match extracted skill names → canonical skillIds
 * Uses case-insensitive name/alias matching
 */
export function matchSkillsToKB(extracted: ExtractedSkill[]): SkillMatchResult {
  const matched: SkillClaim[] = [];
  const unmatched: string[] = [];

  for (const ex of extracted) {
    const normalized = ex.name.toLowerCase().trim();
    let found = false;

    for (const [skillId, skill] of skillById) {
      const nameLower = skill.name.toLowerCase();
      const aliasesLower = skill.aliases.map(a => a.toLowerCase());

      // Exact match or alias match
      if (normalized === nameLower || aliasesLower.includes(normalized)) {
        matched.push({
          skillId,
          proficiency: ex.proficiency,
          confidence: 0.6, // Resume-inferred baseline
          evidence: [{
            type: 'inferred_from_resume',
            description: ex.evidence,
            confidence: 0.6,
            observedAt: new Date().toISOString(),
          }],
        });
        found = true;
        break;
      }

      // Simple token match (e.g., "react" in "react native")
      const tokens = normalized.split(/\s+/);
      const skillTokens = nameLower.split(/\s+/);
      if (tokens.some(t => skillTokens.includes(t)) && tokens.length > 0) {
        matched.push({
          skillId,
          proficiency: ex.proficiency,
          confidence: 0.5, // Lower confidence for token match
          evidence: [{
            type: 'inferred_from_resume',
            description: ex.evidence,
            confidence: 0.5,
            observedAt: new Date().toISOString(),
          }],
        });
        found = true;
        break;
      }
    }

    if (!found) {
      unmatched.push(ex.name);
    }
  }

  return { matched, unmatched };
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
      // Recalculate confidence as max of all evidence
      existing.confidence = Math.max(
        existing.confidence,
        ...existing.evidence.map(e => e.confidence)
      );
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
    confidence: Math.max(claim.confidence, evidence.confidence),
  };
}

// ─── Passport Completeness Calculation ───────────────────────────────────────

/**
 * Calculate passport completeness score (0-100)
 * Formula: basics 20% + skills 20% + riasec 20% + aptitude 15% + values 10% + aspiration 15%
 */
export function calculateCompleteness(passport: CareerPassport): number {
  let score = 0;

  // Basics (20%): segment + education + constraints
  if (passport.segment) score += 5;
  if (passport.education.level !== 'below_10') score += 5;
  if (passport.constraints.location) score += 2;
  if (passport.constraints.languages.length > 0) score += 3;
  if (passport.constraints.weeklyLearningHours > 0) score += 5;

  // Skills (20%)
  if (passport.skills.length >= 10) {
    score += 20;
  } else if (passport.skills.length >= 5) {
    score += 15;
  } else if (passport.skills.length > 0) {
    score += 10;
  }

  // RIASEC (20%)
  if (passport.riasec) score += 20;

  // Aptitude (15%)
  if (passport.aptitude) score += 15;

  // Values (10%)
  if (passport.values) score += 10;

  // Aspiration (15%)
  if (passport.aspiration) {
    score += 10;
    if (passport.aspiration.dreamOccupationIds.length > 0) score += 5;
  }

  return Math.min(100, score);
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
  };

  claims.forEach(claim => {
    const skill = skillById.get(claim.skillId);
    if (skill) {
      if (!groups[skill.category]) {
        groups[skill.category] = [];
      }
      groups[skill.category].push(claim);
    }
  });

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(groups).filter(([_, skills]) => skills.length > 0)
  );
}
