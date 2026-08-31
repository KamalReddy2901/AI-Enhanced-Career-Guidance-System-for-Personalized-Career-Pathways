// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Skill Profile Engine — Evidence-based skill profile builder
// Maps resume/activity → canonical skills with confidence & evidence tracking
// ══════════════════════════════════════════════════════════════════════════════

import { skillById } from '../data/knowledge';
import type {
  CareerPassport,
  EvidenceVerificationState,
  Proficiency,
  SkillClaim,
  SkillClaimProposal,
  SkillEvidence,
} from './types';

// ─── Resume Extraction → Canonical Skills ────────────────────────────────────

export interface ExtractedSkill {
  name: string;
  proficiency: Proficiency;
  evidence: string;
}

export interface SkillMatchResult {
  matched: SkillClaim[];
  unmatched: string[];
}

const normalizeSkillText = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('en')
  .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Stable, literal-derived IDs keep custom claims distinct without pretending
 * that they belong to the canonical taxonomy. */
export function customSkillId(label: string): string {
  const comparisonLabel = normalizeSkillText(label) || 'custom skill';
  let hash = 2166136261;
  for (let index = 0; index < comparisonLabel.length; index += 1) {
    hash ^= comparisonLabel.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const slug = comparisonLabel.replace(/\s+/g, '-').slice(0, 48) || 'custom-skill';
  return `custom:${slug}:${(hash >>> 0).toString(36)}`;
}

/** Resolve a stable display label, including claims saved before custom-skill
 * names became a first-class field. */
export function skillClaimName(claim: SkillClaim): string {
  const canonical = skillById.get(claim.skillId)?.name;
  if (canonical) return canonical;
  if (claim.name?.trim()) return claim.name;
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
  const candidateLabels = lines.flatMap(line => {
    const withoutBullet = line.replace(/^[-*•‣▪◦]+\s*/, '');
    const withoutHeading = withoutBullet.replace(/^(?:skills?|competencies|technologies|tools)\s*:\s*/i, '');
    return [withoutHeading, ...withoutHeading.split(/[,;|]/)].map(label => ({ label: label.trim(), evidence: line }));
  });
  for (const skill of skillById.values()) {
    const phrases = [skill.name, ...skill.aliases.filter(alias=>!ambiguousAliases.has(alias.toLowerCase()))]
      .map(normalizeSkillText);
    const candidate = candidateLabels.find(({ label }) => phrases.includes(normalizeSkillText(label)));
    if (!candidate) continue;
    extracted.push({ name: skill.name, proficiency: 2, evidence: candidate.evidence });
    if (extracted.length === 25) break;
  }
  return extracted;
}

export function combineEvidenceConfidence(evidence: SkillEvidence[]): number {
  return evidence.reduce((highest, item) => Math.max(highest, effectiveEvidenceConfidence(item)), 0);
}

function defaultVerificationState(evidence: SkillEvidence): EvidenceVerificationState {
  if (evidence.type === 'self_reported' || evidence.type === 'pathway_activity') return 'self_attested';
  return 'unreviewed';
}

function evidenceConfidenceCap(evidence: SkillEvidence): number {
  const verificationState = evidence.verificationState ?? defaultVerificationState(evidence);
  if (verificationState === 'revoked' || verificationState === 'disputed') return 0;
  if (verificationState === 'issuer_verified' && evidence.type === 'credentialed') return .97;
  if (verificationState === 'human_attested') return .9;
  if (evidence.type === 'assessed') return .82;
  if (evidence.type === 'self_reported') return .65;
  return .6;
}

export function effectiveEvidenceConfidence(evidence: SkillEvidence): number {
  const confidence = Number.isFinite(evidence.confidence)
    ? Math.max(0, Math.min(1, evidence.confidence))
    : 0;
  return Math.min(confidence, evidenceConfidenceCap(evidence));
}

/**
 * Normalize evidence written before provenance and verification were separated.
 * A legacy `credentialed` entry without explicit issuer verification is treated
 * as a claim, never upgraded based on its wording or confidence.
 */
export function normalizeSkillEvidence(evidence: SkillEvidence): SkillEvidence {
  const looksLikePathwayCompletion = /^Completed pathway step:/i.test(evidence.description);
  const issuerVerified = evidence.verificationState === 'issuer_verified';
  const type = evidence.type === 'credentialed' && !issuerVerified
    ? (looksLikePathwayCompletion ? 'pathway_activity' : 'credential_claim')
    : evidence.type;
  const verificationState = evidence.verificationState
    ?? (type === 'self_reported' || type === 'pathway_activity' ? 'self_attested' : 'unreviewed');
  const normalized = { ...evidence, type, verificationState };
  return { ...normalized, confidence: effectiveEvidenceConfidence(normalized) };
}

export function normalizeSkillClaim(claim: SkillClaim): SkillClaim {
  const existingSkillId = typeof claim.skillId === 'string' ? claim.skillId.trim() : '';
  const literalName = skillById.has(existingSkillId) ? undefined : skillClaimName(claim);
  const skillId = skillById.has(existingSkillId)
    ? existingSkillId
    : (literalName && literalName !== 'Custom skill'
        ? customSkillId(literalName)
        : (existingSkillId || customSkillId('Custom skill')));
  const evidence = claim.evidence.map(normalizeSkillEvidence);
  return {
    ...claim,
    skillId,
    ...(literalName ? { name: literalName } : {}),
    evidence,
    confidence: combineEvidenceConfidence(evidence),
  };
}

export function normalizeSkillClaims(claims: SkillClaim[]): SkillClaim[] {
  return mergeNormalizedSkillClaims(claims.map(normalizeSkillClaim));
}

function mergeNormalizedSkillClaims(claims: SkillClaim[]): SkillClaim[] {
  const skillMap = new Map<string, SkillClaim>();
  for (const claim of claims) {
    const current = skillMap.get(claim.skillId);
    if (!current) {
      skillMap.set(claim.skillId, { ...claim, evidence: [...claim.evidence] });
      continue;
    }
    const evidence = [...current.evidence, ...claim.evidence];
    skillMap.set(claim.skillId, {
      ...current,
      name: current.name || claim.name,
      proficiency: Math.max(current.proficiency, claim.proficiency) as Proficiency,
      evidence,
      confidence: combineEvidenceConfidence(evidence),
    });
  }
  return [...skillMap.values()];
}

export function createSkillClaimProposals(
  claims: SkillClaim[],
  source: SkillClaimProposal['source'],
): SkillClaimProposal[] {
  return claims.map(claim => ({ status: 'proposed', source, claim: normalizeSkillClaim(claim) }));
}

/** User confirmation attests that the extraction is an accurate representation
 * of their resume. It does not turn AI extraction into human/issuer provenance. */
export function confirmSkillClaimProposals(proposals: SkillClaimProposal[]): SkillClaim[] {
  return proposals.map(({ claim }) => normalizeSkillClaim({
    ...claim,
    evidence: claim.evidence.map(evidence => ({
      ...evidence,
      verificationState: evidence.verificationState === 'issuer_verified'
        ? 'issuer_verified'
        : 'self_attested',
    })),
  }));
}

/**
 * Match extracted skill names → canonical skillIds
 * Uses case-insensitive exact name/alias matching. It deliberately performs no
 * token, substring, fuzzy, or synonym matching. Unresolved text remains literal.
 */
export function matchSkillsToKB(extracted: ExtractedSkill[]): SkillMatchResult {
  const matched: SkillClaim[] = [];
  const unmatched: string[] = [];
  const makeClaim = (skillId: string, ex: ExtractedSkill, confidence: number): SkillClaim => ({
    skillId,
    proficiency: ex.proficiency,
    confidence,
    evidence: [{
      type: 'inferred_from_resume',
      description: ex.evidence,
      confidence,
      observedAt: new Date().toISOString(),
      verificationState: 'unreviewed',
    }],
  });
  
  const makeCustomClaim = (ex: ExtractedSkill, confidence: number): SkillClaim => ({
    skillId: customSkillId(ex.name),
    name: ex.name,
    proficiency: ex.proficiency,
    confidence,
    evidence: [{
      type: 'inferred_from_resume',
      description: ex.evidence,
      confidence,
      observedAt: new Date().toISOString(),
      verificationState: 'unreviewed',
    }],
  });

  for (const ex of extracted) {
    const normalized = normalizeSkillText(ex.name);
    if (!normalized) continue;
    
    // Try exact match first
    const exact = [...skillById].find(([, skill]) =>
      [skill.name, ...skill.aliases].some(alias => normalizeSkillText(alias) === normalized),
    );
    if (exact) {
      matched.push(makeClaim(exact[0], ex, .72));
      continue;
    }
    
    matched.push(makeCustomClaim(ex, .6));
    unmatched.push(ex.name);
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
  return mergeNormalizedSkillClaims([
    ...existing.map(normalizeSkillClaim),
    ...newClaims.map(normalizeSkillClaim),
  ]);
}

/**
 * Add validation evidence to a skill claim (from assessment or self-rating)
 */
export function addSkillEvidence(
  claim: SkillClaim,
  evidence: SkillEvidence
): SkillClaim {
  return normalizeSkillClaim({ ...claim, evidence: [...claim.evidence, evidence] });
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
