import {
  occupationById, qualificationsForOccupation, qualificationsForSkill, transitionsFrom,
} from '../data/knowledge';
import type { Qualification, TransitionEdge } from '../data/knowledge';
import type { CareerPassport, PathwayPlan, PathwayRoute, PathwayStep } from './types';
import { computeGapReport, skillName } from './gaps';

const monthFactor = (hours: number): number => Math.max(.6, Math.min(2, 6 / Math.max(1, hours)));
const qualificationMonths = (qualification: Qualification, hours: number): number => Math.max(1, Math.round(qualification.typicalMonths * monthFactor(hours)));

function bestQualificationForGaps(passport: CareerPassport, occupationId: string, skillIds: string[]): Qualification | undefined {
  const direct = qualificationsForOccupation(occupationId);
  if (direct.length) return [...direct].sort((a, b) => {
    const coverage = (qualification: Qualification) => skillIds.filter(id => qualification.developsSkillIds.includes(id)).length;
    const targetLevel = occupationById.get(occupationId)!.nsqfEntryLevel;
    return coverage(b) - coverage(a) || Math.abs(a.nsqfLevel - targetLevel) - Math.abs(b.nsqfLevel - targetLevel) || a.typicalMonths - b.typicalMonths;
  })[0];
  const candidates = new Map<string, Qualification>();
  skillIds.flatMap(qualificationsForSkill).forEach(qualification => candidates.set(qualification.id, qualification));
  return [...candidates.values()].filter(qualification => skillIds.filter(id => qualification.developsSkillIds.includes(id)).length >= 2).sort((a, b) => {
    const coverage = (qualification: Qualification) => skillIds.filter(id => qualification.developsSkillIds.includes(id)).length;
    return coverage(b) - coverage(a) || a.typicalMonths - b.typicalMonths;
  })[0];
}

function totalMonths(steps: PathwayStep[]): number {
  return Math.round(steps.reduce((sum, step) => sum + step.estMonths, 0));
}

/** Build only the focused route. Matching uses this lightweight path to estimate
 * learning capacity without constructing the more expensive stepping-stone graph. */
export function buildDirectRoute(passport: CareerPassport, occupationId: string): PathwayRoute {
  const target = occupationById.get(occupationId)!;
  const gap = computeGapReport(passport, occupationId);
  const topGapIds = gap.gaps.slice(0, 4).map(item => item.skillId);
  const qualification = bestQualificationForGaps(passport, occupationId, topGapIds);
  const steps: PathwayStep[] = [
    ...gap.transferable.slice(0, 2).map(item => ({ kind: 'validate_skill' as const, label: `Validate ${skillName(item.skillId)} through Recognition of Prior Learning`, refId: item.skillId, estMonths: 1, done: false })),
    ...(qualification ? [{ kind: 'qualification' as const, label: qualification.name, refId: qualification.id, nsqfLevel: qualification.nsqfLevel, estMonths: qualificationMonths(qualification, passport.constraints.weeklyLearningHours), done: false }] : topGapIds.map(skillId => ({ kind: 'learn' as const, label: `Build ${skillName(skillId)}`, refId: skillId, estMonths: 1, done: false }))),
    { kind: 'project', label: `Complete a portfolio project demonstrating ${target.title} skills`, estMonths: 1, done: false },
    { kind: 'target', label: `Apply for supervised ${target.title} opportunities`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: 0, done: false },
  ];
  return { kind: 'direct', label: 'Focused route', tradeoff: 'A focused skills-and-evidence route; compare its actual duration with the other options.', totalMonths: totalMonths(steps), steps, confidence: passport.completeness >= 75 ? 'high' : 'medium' };
}

function twoHopCandidate(passport: CareerPassport, targetId: string): { intermediateId: string; first?: TransitionEdge; second: TransitionEdge } | undefined {
  const sources = passport.experiences.flatMap(experience => experience.occupationId ? [experience.occupationId] : []);
  const targetGap = computeGapReport(passport, targetId).sgi;
  const candidates: { intermediateId: string; first?: TransitionEdge; second: TransitionEdge; score: number }[] = [];
  for (const intermediate of occupationById.values()) {
    const second = transitionsFrom(intermediate.id).find(edge => edge.toId === targetId);
    if (!second || computeGapReport(passport, intermediate.id).sgi >= targetGap - 15) continue;
    const first = sources.flatMap(source => transitionsFrom(source)).find(edge => edge.toId === intermediate.id);
    candidates.push({ intermediateId: intermediate.id, first, second, score: (first?.strength ?? .4) + second.strength });
  }
  return candidates.sort((a, b) => b.score - a.score)[0];
}

function steppingStoneRoute(passport: CareerPassport, occupationId: string): PathwayRoute {
  const target = occupationById.get(occupationId)!;
  const candidate = twoHopCandidate(passport, occupationId);
  if (candidate) {
    const intermediate = occupationById.get(candidate.intermediateId)!;
    const steps: PathwayStep[] = [
      { kind: 'transition_role', label: `Move first into ${intermediate.title}`, refId: intermediate.id, nsqfLevel: intermediate.nsqfEntryLevel, estMonths: Math.max(3, Math.round((candidate.first?.typicalYears ?? 1) * 12 * .75)), done: false },
      { kind: 'learn', label: candidate.second.transferNote, refId: intermediate.id, estMonths: Math.max(1, Math.round(candidate.second.typicalYears * 3)), done: false },
      { kind: 'target', label: `Progress from ${intermediate.title} to ${target.title}`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: Math.max(3, Math.round(candidate.second.typicalYears * 12 * .75)), done: false },
    ];
    return { kind: 'stepping_stone', label: 'Lower-risk', tradeoff: 'Slower, but the stepping-stone role can preserve income while relevant evidence grows.', totalMonths: totalMonths(steps), steps, confidence: 'medium' };
  }
  const apprenticeship = qualificationsForOccupation(occupationId).find(qualification => qualification.type === 'apprenticeship') ?? qualificationsForOccupation(occupationId)[0];
  const steps: PathwayStep[] = [
    { kind: 'qualification', label: apprenticeship?.name ?? `${target.title} supervised bridge route`, refId: apprenticeship?.id, nsqfLevel: apprenticeship?.nsqfLevel, estMonths: apprenticeship ? qualificationMonths(apprenticeship, passport.constraints.weeklyLearningHours) : 6, done: false },
    { kind: 'project', label: 'Earn while learning through supervised practice', estMonths: 2, done: false },
    { kind: 'target', label: `Progress into ${target.title}`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: 0, done: false },
  ];
  return { kind: 'stepping_stone', label: 'Lower-risk', tradeoff: 'Uses supervised practice when a two-role transition is not strongly evidenced.', totalMonths: totalMonths(steps), steps, confidence: apprenticeship ? 'medium' : 'low' };
}

function credentialRoute(passport: CareerPassport, occupationId: string): PathwayRoute {
  const target = occupationById.get(occupationId)!;
  const qualifications = qualificationsForOccupation(occupationId).sort((a, b) => Math.abs(a.nsqfLevel - target.nsqfEntryLevel) - Math.abs(b.nsqfLevel - target.nsqfEntryLevel));
  const qualification = qualifications[0];
  const steps: PathwayStep[] = qualification ? [
    { kind: 'qualification', label: `${qualification.name} · multiple-entry/exit progression at NSQF ${qualification.nsqfLevel}`, refId: qualification.id, nsqfLevel: qualification.nsqfLevel, estMonths: qualificationMonths(qualification, passport.constraints.weeklyLearningHours), done: false },
    { kind: 'project', label: 'Complete assessed practical work or internship evidence', estMonths: 1, done: false },
    { kind: 'target', label: `Enter ${target.title} with the credential route`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: 0, done: false },
  ] : [
    { kind: 'learn', label: `Map an accredited credential for ${target.title}`, estMonths: 1, done: false },
    { kind: 'target', label: `Enter ${target.title}`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: 0, done: false },
  ];
  return { kind: 'qualification_first', label: 'Credential route', tradeoff: 'Strongest formal signal, but usually the highest time and cost commitment.', totalMonths: totalMonths(steps), steps, confidence: qualification ? 'high' : 'low' };
}

function entrepreneurialRoute(passport: CareerPassport, occupationId: string): PathwayRoute {
  const target = occupationById.get(occupationId)!;
  const gap = computeGapReport(passport, occupationId);
  const topGapIds = gap.gaps.slice(0, 3).map(item => item.skillId);
  
  const steps: PathwayStep[] = [
    ...topGapIds.map(skillId => ({ kind: 'learn' as const, label: `Build ${skillName(skillId)} through practical projects`, refId: skillId, estMonths: 1, done: false })),
    { kind: 'project', label: `Launch minimum viable service/product as ${target.title}`, estMonths: 2, done: false },
    { kind: 'learn', label: 'Business setup: registration, taxation, basic accounting', estMonths: 1, done: false },
    { kind: 'project', label: 'Acquire first 3-5 paying clients/customers', estMonths: 3, done: false },
    { kind: 'target', label: `Operate as independent ${target.title}`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: 0, done: false },
  ];
  
  return { kind: 'direct', label: 'Entrepreneurial', tradeoff: 'Build your own practice instead of seeking employment. Higher risk, higher autonomy.', totalMonths: totalMonths(steps), steps, confidence: passport.aspiration?.entrepreneurialIntent === 'strong' ? 'medium' : 'low' };
}

function fastTrackRoute(passport: CareerPassport, occupationId: string): PathwayRoute {
  const target = occupationById.get(occupationId)!;
  const gap = computeGapReport(passport, occupationId);
  const topGapIds = gap.gaps.slice(0, 2).map(item => item.skillId);
  
  const steps: PathwayStep[] = [
    { kind: 'learn', label: 'Complete intensive bootcamp or micro-credential program', estMonths: Math.min(3, Math.ceil(passport.constraints.weeklyLearningHours * 4 / 40)), done: false },
    ...topGapIds.map(skillId => ({ kind: 'learn' as const, label: `Master ${skillName(skillId)} via rapid-learning resources`, refId: skillId, estMonths: 1, done: false })),
    { kind: 'project', label: `Build strong portfolio demonstrating ${target.title} capabilities`, estMonths: 1, done: false },
    { kind: 'target', label: `Apply for entry ${target.title} roles with portfolio focus`, refId: target.id, nsqfLevel: target.nsqfEntryLevel, estMonths: 0, done: false },
  ];
  
  return { kind: 'direct', label: 'Fast-track', tradeoff: 'Optimized for speed over credentials. Best for those who can dedicate intensive learning time.', totalMonths: totalMonths(steps), steps, confidence: passport.constraints.weeklyLearningHours >= 15 ? 'medium' : 'low' };
}

export function buildPathwayPlan(passport: CareerPassport, occupationId: string): PathwayPlan {
  if (!occupationById.has(occupationId)) throw new Error(`Unknown occupation: ${occupationId}`);
  
  const routes = [
    buildDirectRoute(passport, occupationId),
    steppingStoneRoute(passport, occupationId),
    credentialRoute(passport, occupationId),
  ];
  
  // Add aspiration-optimized routes
  if (passport.aspiration) {
    if (passport.aspiration.entrepreneurialIntent === 'strong') {
      const occupation = occupationById.get(occupationId)!;
      if (occupation.entrepreneurialFit >= 60) {
        routes.push(entrepreneurialRoute(passport, occupationId));
      }
    }
    if (passport.aspiration.horizonYears && passport.aspiration.horizonYears <= 2) {
      routes.push(fastTrackRoute(passport, occupationId));
    }
  }
  
  return { occupationId, routes, gapReport: computeGapReport(passport, occupationId), createdAt: new Date().toISOString() };
}
