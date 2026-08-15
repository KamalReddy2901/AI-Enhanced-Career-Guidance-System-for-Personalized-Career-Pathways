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
import { computeAptitudeEvidenceAdjustment, applyAptitudeAdjustment } from './aptitude';
import { weightsFor } from './weights';
import { buildDirectRoute } from './pathways';

/** Bump these only when the corresponding reviewed guidance contract changes. */
export const GUIDANCE_ENGINE_VERSION = 'guidance-engine-v2';
export const ASSESSMENT_VERSION = 'assessment-bank-v1';
export const SCORING_VERSION = 'weighted-match-v2';

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const rounded = (value: number): number => Math.round(clamp(value));
const REFERENCE_WEEKLY_LEARNING_HOURS = 6;
const WEEKS_PER_MONTH = 4;

const METRO_CITIES = [
  'ahmedabad', 'bangalore', 'chennai', 'delhi', 'hyderabad', 'kolkata', 'mumbai', 'pune',
];
const TIER_TWO_CITIES = [
  'bhopal', 'bhubaneswar', 'chandigarh', 'coimbatore', 'dehradun', 'guwahati', 'indore',
  'jaipur', 'kanpur', 'kochi', 'lucknow', 'mangalore', 'mysore', 'nagpur', 'nashik',
  'patna', 'raipur', 'ranchi', 'surat', 'thiruvananthapuram', 'vadodara', 'vijayawada',
  'visakhapatnam',
];
const STATE_CAPITALS = [
  ...METRO_CITIES,
  'agartala', 'aizawl', 'amaravati', 'bhopal', 'bhubaneswar', 'chandigarh', 'dehradun',
  'dispur', 'gangtok', 'gandhinagar', 'guwahati', 'imphal', 'itanagar', 'jaipur', 'kohima',
  'lucknow', 'panaji', 'patna', 'raipur', 'ranchi', 'shillong', 'shimla', 'srinagar',
  'thiruvananthapuram',
];
const INDUSTRIAL_HUBS = [
  ...METRO_CITIES,
  'aurangabad', 'coimbatore', 'faridabad', 'gurgaon', 'jamshedpur', 'kanpur', 'ludhiana',
  'noida', 'rajkot', 'surat', 'vadodara', 'visakhapatnam',
];

function normalizeLocation(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bbengaluru\b/g, 'bangalore')
    .replace(/\bmysuru\b/g, 'mysore')
    .replace(/\bgurugram\b/g, 'gurgaon')
    .replace(/\bnew delhi\b/g, 'delhi')
    .replace(/\bdelhi ncr\b/g, 'delhi')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationInSet(location: string, places: string[]): boolean {
  return places.some(place => location.includes(place));
}

function regionMatchesLocation(locationText: string, regionText: string): boolean {
  const location = normalizeLocation(locationText);
  const region = normalizeLocation(regionText);
  if (!location || !region) return false;

  if (location.includes(region) || region.includes(location)) return true;
  if (region === 'india' || region.includes('all india') || region.includes('nationwide')) return true;
  if (region.includes('rural') && region.includes('urban')) return true;
  if (region.includes('metro') && locationInSet(location, METRO_CITIES)) return true;
  if (region.includes('tier 1') && locationInSet(location, METRO_CITIES)) return true;
  if (region.includes('tier 2') && locationInSet(location, TIER_TWO_CITIES)) return true;
  if (region.includes('state capital') && locationInSet(location, STATE_CAPITALS)) return true;
  if (region.includes('urban') && locationInSet(location, [...METRO_CITIES, ...TIER_TWO_CITIES, ...STATE_CAPITALS])) return true;
  if (region.includes('industrial hub') && locationInSet(location, INDUSTRIAL_HUBS)) return true;
  if (region.includes('rural') && /\b(rural|village|district)\b/.test(location)) return true;

  return false;
}

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

function aptitudeScore(passport: CareerPassport, occupation: Occupation): [number, boolean, number] {
  if (!passport.aptitude) return [50, false, 0];
  
  // Compute adjusted aptitude scores if evidence exists
  let scores = passport.aptitude;
  let adjustment = 0;
  
  if (passport.aptitudeEvidence && passport.aptitudeEvidence.length > 0) {
    const adjustments = computeAptitudeEvidenceAdjustment(passport.aptitudeEvidence);
    const baseline = passport.aptitudeBaseline || passport.aptitude;
    scores = applyAptitudeAdjustment(baseline, adjustments);
    
    // Calculate average adjustment for disclosure
    const dimensions = ['numerical', 'verbal', 'logical', 'spatial'] as const;
    adjustment = Math.round(
      dimensions.reduce((sum, dim) => sum + adjustments[dim], 0) / dimensions.length
    );
  }
  
  const dimensions = ['numerical', 'verbal', 'logical', 'spatial'] as const;
  const denominator = dimensions.reduce((sum, dimension) => sum + 100 * occupation.aptitudeProfile[dimension], 0);
  const numerator = dimensions.reduce((sum, dimension) => sum + scores[dimension] * occupation.aptitudeProfile[dimension], 0);
  return [denominator ? 100 * numerator / denominator : 50, true, adjustment];
}

function valuesScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.values) return [50, false];
  const dimensions = ['stability', 'growth', 'autonomy', 'impact', 'balance', 'compensation'] as const;
  return [100 - dimensions.reduce((sum, dimension) => sum + Math.abs(passport.values![dimension] - occupation.valuesProfile[dimension]), 0) / dimensions.length, true];
}

function skillScore(passport: CareerPassport, occupation: Occupation): [number, boolean] {
  if (!passport.skills.length) return [50, false];
  const totalImportance = occupation.skills.reduce((sum, requirement) => sum + requirement.importance, 0);
  const coverage = occupation.skills.reduce((sum, requirement) => {
    const claim = passport.skills.find(item => item.skillId === requirement.skillId);
    const current = claim?.proficiency ?? 0;
    // A self-report or weak resume match is useful, but should not carry the
    // same force as independently supported evidence.
    const evidenceConfidence = claim?.confidence ?? 0;
    return sum + Math.min(current, requirement.requiredProficiency) / requirement.requiredProficiency * evidenceConfidence * requirement.importance;
  }, 0);
  return [totalImportance ? 100 * coverage / totalImportance : 50, true];
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
  
  let score = 30; // Base score
  
  // Exact occupation match - strongest signal
  if (passport.aspiration.dreamOccupationIds.includes(occupation.id)) {
    score = 100;
  }
  // Cluster match - strong signal
  else if (passport.aspiration.dreamOccupationIds.some(id => occupationById.get(id)?.cluster === occupation.cluster)) {
    score = 75;
  }
  // Theme match - moderate signal
  else {
    const haystack = `${occupation.title} ${occupation.sector} ${occupation.cluster} ${occupation.descriptionKey}`.toLowerCase();
    if (passport.aspiration.themes.some(theme => haystack.includes(theme.toLowerCase()))) {
      score = 65;
    }
  }
  
  // Boost for entrepreneurial intent alignment
  if (passport.aspiration.entrepreneurialIntent === 'strong' && occupation.entrepreneurialFit >= 70) {
    score = Math.min(100, score + 15);
  }
  
  // Boost for horizon alignment - short-term goals + accessible careers
  if (passport.aspiration.horizonYears && passport.aspiration.horizonYears <= 2 && occupation.nsqfEntryLevel <= 5) {
    score = Math.min(100, score + 10);
  }
  
  return [clamp(score), true];
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
  if (signal.regions.some(region => regionMatchesLocation(passport.constraints.location, region))) return 85;
  return passport.constraints.canRelocate ? 70 : 55;
}

function directRouteMonths(passport: CareerPassport, occupationId: string): number {
  return buildDirectRoute(passport, occupationId).totalMonths;
}

function learningCapacityPenalty(passport: CareerPassport, occupationId: string): number {
  const projectedMonths = directRouteMonths(passport, occupationId);
  if (!projectedMonths) return 0;

  // Calibrate the route's approximate workload at a neutral 6 h/week, then
  // compare hours-to-hours against the user's capacity over their projected
  // route duration. This avoids the previous weeks-vs-hours dimensional bug.
  const referencePassport: CareerPassport = {
    ...passport,
    constraints: {
      ...passport.constraints,
      weeklyLearningHours: REFERENCE_WEEKLY_LEARNING_HOURS,
    },
  };
  const referenceMonths = directRouteMonths(referencePassport, occupationId);
  const estimatedRequiredHours = referenceMonths * WEEKS_PER_MONTH * REFERENCE_WEEKLY_LEARNING_HOURS;
  const availableHours = projectedMonths * WEEKS_PER_MONTH * Math.max(0, passport.constraints.weeklyLearningHours);

  return availableHours < estimatedRequiredHours ? 15 : 0;
}

function component(
  dimension: FitDimension,
  score: number,
  weight: number,
  note: string,
  dataAvailable: boolean,
  source: ComponentScore['source'],
  sourceDetail: string,
): ComponentScore {
  return { dimension, score: rounded(score), weight, note, dataAvailable, source, sourceDetail };
}

function scoreOccupation(passport: CareerPassport, occupation: Occupation, momentumBoost = 0): CareerRecommendation {
  const weights = weightsFor(passport.segment);
  const [interest, hasInterest] = interestScore(passport, occupation);
  const [aptitude, hasAptitude, aptitudeAdjustment] = aptitudeScore(passport, occupation);
  const [values, hasValues] = valuesScore(passport, occupation);
  const [skill, hasSkills] = skillScore(passport, occupation);
  const [transferable, hasTransferable] = transferableScore(passport, occupation);
  const [experience, hasExperience] = experienceScore(passport, occupation);
  const [aspiration, hasAspiration] = aspirationScore(passport, occupation);
  const gapReport = computeGapReport(passport, occupation.id);
  const capacityPenalty = learningCapacityPenalty(passport, occupation.id);
  let feasibility = 100 - gapReport.sgi - capacityPenalty;
  // A small, capped adjustment reflecting demonstrated recent progress (new
  // skill evidence, confidence gains, assessments completed in the last 14
  // days). Only applied once there is skill evidence to judge feasibility
  // against, and always disclosed in the component note below.
  const appliedMomentumBoost = hasSkills ? Math.max(0, Math.min(6, momentumBoost)) : 0;
  if (appliedMomentumBoost > 0) feasibility = clamp(feasibility + appliedMomentumBoost);

  const learningNote = capacityPenalty > 0
    ? `skill-gap readiness adjusted for weekly learning capacity; a ${capacityPenalty}-point capacity penalty applies because the estimated route workload exceeds the hours available across its projected duration`
    : 'skill-gap readiness adjusted using a route workload estimate and weekly learning capacity';
  const learningSource = `Computed from skill gaps and an hours-to-hours route-capacity comparison calibrated at ${REFERENCE_WEEKLY_LEARNING_HOURS} h/week`;

  const components = [
    component('interest', interest, weights.interest, hasInterest ? 'RIASEC cosine similarity with this occupation profile' : 'neutral until the interest inventory is complete', hasInterest, 'assessment', hasInterest ? ASSESSMENT_VERSION : 'Assessment not yet completed'),
    component('aptitude', aptitude, weights.aptitude, hasAptitude ? (aptitudeAdjustment > 0 ? `weighted against this role's numerical, verbal, logical and spatial demands, with a +${aptitudeAdjustment}-point average adjustment from conversational evidence (capped at +6 per dimension)` : `weighted against this role's numerical, verbal, logical and spatial demands`) : 'neutral until the aptitude screener is complete', hasAptitude, 'assessment', hasAptitude ? (aptitudeAdjustment > 0 ? `${ASSESSMENT_VERSION} screener baseline + ${passport.aptitudeEvidence?.length ?? 0} evidence items from Aptitude Signal Discovery` : ASSESSMENT_VERSION) : 'Assessment not yet completed'),
    component('values', values, weights.values, hasValues ? 'mean distance from the work values this role typically offers' : 'neutral until the values sorter is complete', hasValues, 'assessment', hasValues ? ASSESSMENT_VERSION : 'Assessment not yet completed'),
    component('skill', skill, weights.skill, hasSkills ? 'proficiency-weighted coverage, moderated by evidence confidence' : 'neutral until skills are added', hasSkills, 'career_passport', hasSkills ? 'Skills and supporting evidence in your Career Passport' : 'No skill evidence recorded'),
    component('transferable', transferable, weights.transferable, hasTransferable ? 'strongest evidence-backed transition from prior experience' : 'neutral because no mapped experience is available', hasTransferable, 'career_passport', hasTransferable ? 'Mapped work experience and supporting skill evidence' : 'No mapped work experience recorded'),
    component('experience', experience, weights.experience, hasExperience ? 'years in the same occupational cluster' : 'neutral because no experience is recorded', hasExperience, 'career_passport', hasExperience ? 'Work history in your Career Passport' : 'No work experience recorded'),
    component('aspiration', aspiration, weights.aspiration, hasAspiration ? 'dream roles and themes in your stated aspiration' : 'neutral until an aspiration is recorded', hasAspiration, 'career_passport', hasAspiration ? 'Your recorded aspiration and timeframe' : 'No aspiration recorded'),
    component('market', marketScore(occupation), weights.market, 'timestamped indicative demand signal with trend adjustment', true, 'market_snapshot', (() => { const signal = marketFor(occupation.id); return signal ? `${signal.observedPeriod} · ${signal.source}` : 'No market snapshot available; neutral score used'; })()),
    component('progression', progressionScore(occupation), weights.progression, 'number and strength of grounded outgoing transitions', true, 'knowledge_base', `Transition map in ${KB_VERSION}`),
    component('learningFeasibility', feasibility, weights.learningFeasibility, appliedMomentumBoost > 0 ? `${learningNote}, plus a +${Math.round(appliedMomentumBoost)}-point recent-momentum adjustment from your last two weeks of profile activity` : learningNote, hasSkills, 'computed', appliedMomentumBoost > 0 ? `${learningSource}; recent profile momentum also applied` : learningSource),
    component('geographic', geographicScore(passport, occupation), weights.geographic, 'normalized location and relocation preference compared with indicative market regions', Boolean(passport.constraints.location), 'market_snapshot', passport.constraints.location ? 'Your stated location, common Indian city aliases, broad region categories, and relocation preference compared with indicative regions' : 'No location recorded; neutral score used'),
  ];
  const totalScore = rounded(components.reduce((sum, item) => sum + item.score * item.weight, 0));
  const evidenceConfidences = passport.skills.map(claim => claim.confidence);
  const meanEvidence = evidenceConfidences.length ? evidenceConfidences.reduce((sum, value) => sum + value, 0) / evidenceConfidences.length : 0;
  const confidence: CareerRecommendation['confidence'] = passport.completeness >= 75 && meanEvidence >= .7 ? 'high' : passport.completeness < 40 ? 'low' : 'medium';
  const preview = gapReport.gaps.slice(0, 3).map(gap => ({ skillId: gap.skillId, severity: gap.severity }));
  const userEvidenceComponents = components.filter(item => item.source === 'assessment' || item.source === 'career_passport');
  const availableWeight = userEvidenceComponents.filter(item => item.dataAvailable).reduce((sum, item) => sum + item.weight, 0);
  const possibleWeight = userEvidenceComponents.reduce((sum, item) => sum + item.weight, 0);
  const evidenceCoverage = possibleWeight ? rounded(100 * availableWeight / possibleWeight) : 100;
  const whyNotHigher = buildWhyNotHigher(components);
  if (preview[0]) whyNotHigher.unshift(counterfactualText(passport, occupation.id, totalScore, preview[0].skillId, occupation.skills.find(req => req.skillId === preview[0].skillId)?.requiredProficiency ?? 2));
  return { occupationId: occupation.id, totalScore, confidence, group: 'best_fit', components, topReasons: buildTopReasons(components), whyNotHigher: whyNotHigher.slice(0, 3), skillGapPreview: preview, evidenceCoverage };
}

export function matchCareers(passport: CareerPassport, options: { momentumBoost?: number } = {}): RecommendationSet {
  const momentumBoost = options.momentumBoost ?? 0;
  // The reviewed KB currently contains 100 occupations, so exhaustive scoring
  // is cheap and avoids order-biased pre-pruning when profile evidence is sparse.
  const all = OCCUPATIONS.map(occupation => scoreOccupation(passport, occupation, momentumBoost)).sort((a, b) => b.totalScore - a.totalScore || a.occupationId.localeCompare(b.occupationId));
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

  return { generatedAt: new Date().toISOString(), passportVersion: passport.version, kbVersion: KB_VERSION, engineVersion: GUIDANCE_ENGINE_VERSION, assessmentVersion: ASSESSMENT_VERSION, scoringVersion: SCORING_VERSION, segment: passport.segment, weightsUsed: weightsFor(passport.segment), recommendations: selected };
}
