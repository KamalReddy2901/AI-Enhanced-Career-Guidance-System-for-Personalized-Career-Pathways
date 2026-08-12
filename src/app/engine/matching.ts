import {
  KB_VERSION, OCCUPATIONS, marketFor, occupationById, transitionsFrom,
} from '../data/knowledge';
import type { Occupation } from '../data/knowledge';
import type {
  CareerPassport, CareerRecommendation, ComponentScore, FitDimension,
  RecommendationGroup, RecommendationSet,
} from './types';
import { computeGapReport } from './gaps';
import { buildTopReasons, buildWhyNotHigher, counterfactualText } from './explain';
import { weightsFor } from './weights';
import { buildPathwayPlan } from './pathways';

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const rounded = (value: number): number => Math.round(clamp(value));

function cosine(user: number[], target: number[]): number {
  const dot = user.reduce((sum, value, index) => sum + value * target[index], 0);
  const userMagnitude = Math.sqrt(user.reduce((sum, value) => sum + value ** 2, 0));
  const targetMagnitude = Math.sqrt(target.reduce((sum, value) => sum + value ** 2, 0));
  return userMagnitude && targetMagnitude ? 100 * dot / (userMagnitude * targetMagnitude) : 50;
}

function interestScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.riasec) return [50, false];
  return [cosine(
    [passport.riasec.R, passport.riasec.I, passport.riasec.A, passport.riasec.S, passport.riasec.E, passport.riasec.C],
    [occupation.riasecProfile.R, occupation.riasecProfile.I, occupation.riasecProfile.A, occupation.riasecProfile.S, occupation.riasecProfile.E, occupation.riasecProfile.C],
  ), true];
}

function aptitudeScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.aptitude) return [50, false];
  const dimensions = ['numerical', 'verbal', 'logical', 'spatial'] as const;
  const denominator = dimensions.reduce((sum, dimension) => sum + 100 * occupation.aptitudeProfile[dimension], 0);
  const numerator = dimensions.reduce((sum, dimension) => sum + passport.aptitude![dimension] * occupation.aptitudeProfile[dimension], 0);
  return [denominator ? 100 * numerator / denominator : 50, true];
}

function valuesScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.values) return [50, false];
  const dimensions = ['stability', 'growth', 'autonomy', 'impact', 'balance', 'compensation'] as const;
  return [100 - dimensions.reduce((sum, dimension) => sum + Math.abs(passport.values![dimension] - occupation.valuesProfile[dimension]), 0) / dimensions.length, true];
}

function skillScore(passport: CareerPassport, occupation: Occupation): number {
  const totalImportance = occupation.skills.reduce((sum, requirement) => sum + requirement.importance, 0);
  const coverage = occupation.skills.reduce((sum, requirement) => {
    const current = passport.skills.find(claim => claim.skillId === requirement.skillId)?.proficiency ?? 0;
    return sum + Math.min(current, requirement.requiredProficiency) / requirement.requiredProficiency * requirement.importance;
  }, 0);
  return totalImportance ? 100 * coverage / totalImportance : 0;
}

function transferableScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  const sourceIds = passport.experiences.flatMap(experience => experience.occupationId ? [experience.occupationId] : []);
  if (!sourceIds.length) return [50, false];
  const strongest = Math.max(0, ...sourceIds.flatMap(sourceId => transitionsFrom(sourceId).filter(edge => edge.toId === occupation.id).map(edge => edge.strength)));
  const evidenced = occupation.skills.filter(requirement => passport.skills.some(claim => claim.skillId === requirement.skillId && claim.proficiency >= requirement.requiredProficiency && claim.evidence.some(evidence => evidence.type === 'inferred_from_resume' || evidence.type === 'credentialed'))).length;
  return [clamp(strongest * 100 + (evidenced >= 3 ? 10 : 0)), true];
}

function experienceScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.experiences.length) return [50, false];
  const relatedYears = passport.experiences.reduce((sum, experience) => {
    const source = experience.occupationId ? occupationById.get(experience.occupationId) : undefined;
    return sum + (source?.cluster === occupation.cluster ? experience.years : 0);
  }, 0);
  return [Math.min(100, relatedYears * 20), true];
}

function aspirationScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.aspiration) return [50, false];
  if (passport.aspiration.dreamOccupationIds.includes(occupation.id)) return [100, true];
  if (passport.aspiration.dreamOccupationIds.some(id => occupationById.get(id)?.cluster === occupation.cluster)) return [70, true];
  const haystack = `${occupation.title} ${occupation.sector} ${occupation.cluster} ${occupation.descriptionKey}`.toLowerCase();
  return [passport.aspiration.themes.some(theme => haystack.includes(theme.toLowerCase())) ? 55 : 30, true];
}

function marketScore(occupation: Occupation): number {
  const signal = marketFor(occupation.id);
  if (!signal) return 50;
  return clamp(signal.demandIndex + (signal.growthTrend === 'rising' ? 10 : signal.growthTrend === 'declining' ? -15 : 0));
}

function progressionScore(occupation: Occupation): number {
  const outgoing = transitionsFrom(occupation.id);
  return clamp(25 * outgoing.length + 30 * Math.max(0, ...outgoing.map(edge => edge.strength)) + (occupation.isEmerging ? 15 : 0));
}

function geographicScore(passport: CareerPassport, occupation: Occupation): number {
  const signal = marketFor(occupation.id);
  if (!signal || !passport.constraints.location) return 70;
  const location = passport.constraints.location.toLowerCase();
  if (signal.regions.some(region => location.includes(region.toLowerCase()) || region.toLowerCase().includes(location))) return 85;
  return passport.constraints.canRelocate ? 70 : 55;
}

function component(dimension: FitDimension, score: number, weight: number, note: string, dataAvailable = true): ComponentScore {
  return { dimension, score: rounded(score), weight, note, dataAvailable };
}

function scoreOccupation(passport: CareerPassport, occupation: Occupation): CareerRecommendation {
  const weights = weightsFor(passport.segment);
  const [interest, hasInterest] = interestScore(passport, occupation);
  const [aptitude, hasAptitude] = aptitudeScore(passport, occupation);
  const [values, hasValues] = valuesScore(passport, occupation);
  const [transferable, hasTransferable] = transferableScore(passport, occupation);
  const [experience, hasExperience] = experienceScore(passport, occupation);
  const [aspiration, hasAspiration] = aspirationScore(passport, occupation);
  const gapReport = computeGapReport(passport, occupation.id);
  let feasibility = 100 - gapReport.sgi;
  const directMonths = buildPathwayPlan(passport, occupation.id).routes.find(route => route.kind === 'direct')?.totalMonths ?? 0;
  if (directMonths * 4 > passport.constraints.weeklyLearningHours * 40) feasibility -= 15;

  const components = [
    component('interest', interest, weights.interest, hasInterest ? 'RIASEC cosine similarity with this occupation profile' : 'neutral until the interest inventory is complete', hasInterest),
    component('aptitude', aptitude, weights.aptitude, hasAptitude ? 'weighted against this role’s numerical, verbal, logical and spatial demands' : 'neutral until the aptitude screener is complete', hasAptitude),
    component('values', values, weights.values, hasValues ? 'mean distance from the work values this role typically offers' : 'neutral until the values sorter is complete', hasValues),
    component('skill', skillScore(passport, occupation), weights.skill, 'proficiency-weighted coverage of required skills'),
    component('transferable', transferable, weights.transferable, hasTransferable ? 'strongest evidence-backed transition from prior experience' : 'neutral because no mapped experience is available', hasTransferable),
    component('experience', experience, weights.experience, hasExperience ? 'years in the same occupational cluster' : 'neutral because no experience is recorded', hasExperience),
    component('aspiration', aspiration, weights.aspiration, hasAspiration ? 'dream roles and themes in your stated aspiration' : 'neutral until an aspiration is recorded', hasAspiration),
    component('market', marketScore(occupation), weights.market, 'timestamped indicative demand signal with trend adjustment'),
    component('progression', progressionScore(occupation), weights.progression, 'number and strength of grounded outgoing transitions'),
    component('learningFeasibility', feasibility, weights.learningFeasibility, 'skill-gap readiness adjusted for weekly learning time'),
    component('geographic', geographicScore(passport, occupation), weights.geographic, 'location and relocation preference compared with signal regions'),
  ];
  const totalScore = rounded(components.reduce((sum, item) => sum + item.score * item.weight, 0));
  const evidenceConfidences = passport.skills.map(claim => claim.confidence);
  const meanEvidence = evidenceConfidences.length ? evidenceConfidences.reduce((sum, value) => sum + value, 0) / evidenceConfidences.length : 0;
  const confidence: CareerRecommendation['confidence'] = passport.completeness >= 75 && meanEvidence >= .7 ? 'high' : passport.completeness < 40 ? 'low' : 'medium';
  const preview = gapReport.gaps.slice(0, 3).map(gap => ({ skillId: gap.skillId, severity: gap.severity }));
  const whyNotHigher = buildWhyNotHigher(components);
  if (preview[0]) whyNotHigher.unshift(counterfactualText(passport, occupation.id, totalScore, preview[0].skillId, occupation.skills.find(req => req.skillId === preview[0].skillId)?.requiredProficiency ?? 2));
  return { occupationId: occupation.id, totalScore, confidence, group: 'best_fit', components, topReasons: buildTopReasons(components), whyNotHigher: whyNotHigher.slice(0, 3), skillGapPreview: preview };
}

function candidateOccupations(passport: CareerPassport): Occupation[] {
  const scored = OCCUPATIONS.map(occupation => ({ occupation, interest: interestScore(passport, occupation)[0], skill: skillScore(passport, occupation) }));
  const ids = new Set<string>();
  scored.sort((a, b) => b.interest - a.interest).slice(0, 40).forEach(item => ids.add(item.occupation.id));
  scored.sort((a, b) => b.skill - a.skill).slice(0, 30).forEach(item => ids.add(item.occupation.id));
  for (const experience of passport.experiences) {
    if (!experience.occupationId) continue;
    for (const edge of transitionsFrom(experience.occupationId)) {
      ids.add(edge.toId);
      transitionsFrom(edge.toId).forEach(next => ids.add(next.toId));
    }
  }
  passport.aspiration?.dreamOccupationIds.forEach(id => ids.add(id));
  const representedClusters = new Set([...ids].map(id => occupationById.get(id)?.cluster));
  OCCUPATIONS.filter(occupation => !representedClusters.has(occupation.cluster) || occupation.isEmerging).slice(0, 8).forEach(occupation => ids.add(occupation.id));
  return OCCUPATIONS.filter(occupation => ids.has(occupation.id));
}

export function matchCareers(passport: CareerPassport): RecommendationSet {
  const all = candidateOccupations(passport).map(occupation => scoreOccupation(passport, occupation)).sort((a, b) => b.totalScore - a.totalScore || a.occupationId.localeCompare(b.occupationId));
  const selected: CareerRecommendation[] = [];
  const used = new Set<string>();
  const add = (recommendation: CareerRecommendation, group: RecommendationGroup) => {
    if (used.has(recommendation.occupationId)) return;
    selected.push({ ...recommendation, group });
    used.add(recommendation.occupationId);
  };

  const bestClusters = new Set<string>();
  for (const recommendation of all) {
    const cluster = occupationById.get(recommendation.occupationId)?.cluster;
    if (!cluster || bestClusters.has(cluster)) continue;
    add(recommendation, 'best_fit'); bestClusters.add(cluster);
    if (bestClusters.size === 3) break;
  }
  all.filter(rec => { const occupation = occupationById.get(rec.occupationId)!; return occupation.isEmerging || marketFor(occupation.id)?.growthTrend === 'rising'; }).slice(0, 5).forEach(rec => { if (selected.filter(item => item.group === 'growth').length < 2) add(rec, 'growth'); });
  [...all].sort((a, b) => (b.components.find(c => c.dimension === 'transferable')!.score + b.components.find(c => c.dimension === 'skill')!.score) - (a.components.find(c => c.dimension === 'transferable')!.score + a.components.find(c => c.dimension === 'skill')!.score)).forEach(rec => { if (selected.filter(item => item.group === 'easiest_transition').length < 2) add(rec, 'easiest_transition'); });
  all.filter(rec => passport.aspiration?.dreamOccupationIds.includes(rec.occupationId)).forEach(rec => { if (selected.filter(item => item.group === 'aspiration').length < 2) add(rec, 'aspiration'); });
  const exploration = all.filter(rec => { const occupation = occupationById.get(rec.occupationId)!; return !bestClusters.has(occupation.cluster); });
  const emergingExploration = exploration.find(rec => occupationById.get(rec.occupationId)?.isEmerging);
  if (emergingExploration) add(emergingExploration, 'exploration');
  exploration.forEach(rec => { if (selected.filter(item => item.group === 'exploration').length < 2) add(rec, 'exploration'); });
  all.filter(rec => { const occupation = occupationById.get(rec.occupationId)!; return occupation.isVocational || occupation.entrepreneurialFit >= 70; }).forEach(rec => { if (selected.filter(item => item.group === 'vocational_entrepreneurial').length < 2) add(rec, 'vocational_entrepreneurial'); });
  all.forEach(rec => { if (selected.length < 13) add(rec, 'exploration'); });

  return { generatedAt: new Date().toISOString(), passportVersion: passport.version, kbVersion: KB_VERSION, segment: passport.segment, weightsUsed: weightsFor(passport.segment), recommendations: selected };
}
