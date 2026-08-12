import { occupationById, skillById } from '../data/knowledge';
import type { CareerPassport, GapReport, Proficiency, SkillClaim } from './types';

export function claimFor(passport: CareerPassport, skillId: string): SkillClaim | undefined {
  return passport.skills.find(claim => claim.skillId === skillId);
}

export function computeGapReport(passport: CareerPassport, occupationId: string): GapReport {
  const occupation = occupationById.get(occupationId);
  if (!occupation) throw new Error(`Unknown occupation: ${occupationId}`);

  const raw = occupation.skills.map(requirement => {
    const claim = claimFor(passport, requirement.skillId);
    const current = (claim?.proficiency ?? 0) as Proficiency;
    const confidence = claim?.confidence ?? 0;
    const shortfall = Math.max(requirement.requiredProficiency - current, 0) / 4;
    const severityContribution = shortfall * requirement.importance * (2 - confidence);
    const maximumContribution = requirement.requiredProficiency / 4 * requirement.importance * 2;
    return { requirement, claim, current, confidence, severityContribution, maximumContribution };
  });

  const maximum = raw.reduce((sum, item) => sum + item.maximumContribution, 0);
  const actual = raw.reduce((sum, item) => sum + item.severityContribution, 0);
  const sgi = maximum > 0 ? Math.round(Math.min(100, actual / maximum * 100)) : 0;

  const gaps = raw.map(item => ({
    skillId: item.requirement.skillId,
    required: item.requirement.requiredProficiency,
    current: item.current,
    importance: item.requirement.importance,
    confidence: item.confidence,
    severity: maximum > 0 ? Math.round(item.severityContribution / maximum * 100) : 0,
  })).filter(gap => gap.current < gap.required).sort((a, b) => b.severity - a.severity);

  const transferable = raw.filter(item => item.claim && item.current >= item.requirement.requiredProficiency).map(item => ({
    skillId: item.requirement.skillId,
    fromExperience: item.claim!.evidence[0]?.description ?? 'Evidence recorded in your Career Passport',
  }));

  return { occupationId, gaps, transferable, sgi, readiness: 100 - sgi };
}

export function skillName(skillId: string): string {
  return skillById.get(skillId)?.name ?? skillId;
}
