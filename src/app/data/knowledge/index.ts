import { SKILLS as RAW_SKILLS } from './skills';
import { OCCUPATIONS as RAW_OCCUPATIONS } from './occupations';
import { TRANSITIONS as RAW_TRANSITIONS } from './transitions';
import { QUALIFICATIONS as RAW_QUALIFICATIONS } from './qualifications';
import { MARKET_SIGNALS as RAW_MARKET_SIGNALS } from './market';
import { providerLinksForQualification } from './providers';
import type { Skill, Occupation, TransitionEdge, Qualification, MarketSignal, OccupationSkillReq } from './schema';

export const KB_VERSION = 'kb-2026.06.1';
export const KB_LICENSE_NOTE = 'Curated demonstration dataset grounded in NCO-2015 codes and NSQF levels. Demand figures are indicative snapshots, not live statistics.';

export const SKILLS: Skill[] = RAW_SKILLS;
const skillIds = new Set(SKILLS.map(skill => skill.id));

const excludedOccupationIds = new Set([
  'painter', 'driver', 'bank-teller', 'tax-consultant',
  'college-professor', 'tutor', 'delivery-manager', 'customs-officer',
]);

const clusterDefaults: Record<string, string[]> = {
  analytical: ['critical-thinking', 'data-analysis', 'research', 'communication', 'documentation', 'time-management'],
  creative: ['communication', 'attention-to-detail', 'adaptability', 'client-management', 'project-management', 'presentation'],
  people: ['communication', 'empathy', 'team-collaboration', 'patience', 'documentation', 'time-management'],
  hands_on: ['troubleshooting', 'equipment-maintenance', 'safety-compliance', 'attention-to-detail', 'time-management', 'communication'],
  enterprising: ['communication', 'negotiation', 'leadership', 'client-management', 'budgeting', 'decision-making'],
  structured: ['attention-to-detail', 'documentation', 'time-management', 'quality-assurance', 'communication', 'excel'],
};

function completeRequirements(occupation: Occupation): OccupationSkillReq[] {
  const requirements = occupation.skills.filter(req => skillIds.has(req.skillId));
  const seen = new Set(requirements.map(req => req.skillId));
  const defaults = clusterDefaults[occupation.cluster] ?? clusterDefaults.structured;
  for (const skillId of defaults) {
    if (requirements.length >= 6) break;
    if (!seen.has(skillId) && skillIds.has(skillId)) {
      requirements.push({ skillId, requiredProficiency: 2, importance: 0.58 });
      seen.add(skillId);
    }
  }
  return requirements;
}

export const OCCUPATIONS: Occupation[] = RAW_OCCUPATIONS
  .filter((occupation, index, all) => all.findIndex(item => item.id === occupation.id) === index)
  .filter(occupation => !excludedOccupationIds.has(occupation.id))
  .slice(0, 100)
  .map(occupation => ({ ...occupation, skills: completeRequirements(occupation) }));

const occupationIds = new Set(OCCUPATIONS.map(occupation => occupation.id));
const rawValidTransitions = RAW_TRANSITIONS.filter(edge => occupationIds.has(edge.fromId) && occupationIds.has(edge.toId) && edge.fromId !== edge.toId);
const transitionKey = (edge: Pick<TransitionEdge, 'fromId' | 'toId'>) => `${edge.fromId}>${edge.toId}`;
const transitionKeys = new Set(rawValidTransitions.map(transitionKey));
const supplementedTransitions: TransitionEdge[] = [...rawValidTransitions];

for (const [sourceIndex, source] of OCCUPATIONS.entries()) {
  const outgoing = supplementedTransitions.filter(edge => edge.fromId === source.id);
  const candidates = OCCUPATIONS
    .filter(target => target.id !== source.id)
    .sort((a, b) => {
      const score = (target: Occupation) => (target.sector === source.sector ? 3 : 0) + (target.cluster === source.cluster ? 2 : 0) + (target.nsqfEntryLevel >= source.nsqfEntryLevel ? 1 : 0);
      return score(b) - score(a) || ((OCCUPATIONS.indexOf(a) - sourceIndex + 100) % 100) - ((OCCUPATIONS.indexOf(b) - sourceIndex + 100) % 100);
    });
  for (const target of candidates) {
    if (outgoing.length >= 3) break;
    const key = `${source.id}>${target.id}`;
    if (transitionKeys.has(key)) continue;
    const shared = source.skills.map(req => req.skillId).filter(skillId => target.skills.some(req => req.skillId === skillId)).slice(0, 3);
    supplementedTransitions.push({
      fromId: source.id,
      toId: target.id,
      strength: source.cluster === target.cluster ? 0.78 : source.sector === target.sector ? 0.68 : 0.55,
      typicalYears: target.nsqfEntryLevel > source.nsqfEntryLevel ? 2 : 1,
      transferNote: `${shared.map(id => SKILLS.find(skill => skill.id === id)?.name ?? id).join(', ') || 'Communication and disciplined delivery'} transfer directly; the target role adds sector-specific practice.`,
    });
    transitionKeys.add(key);
    outgoing.push(supplementedTransitions[supplementedTransitions.length - 1]);
  }
}

export const TRANSITIONS: TransitionEdge[] = supplementedTransitions;

const sanitizedQualifications: Qualification[] = RAW_QUALIFICATIONS
  .map(qualification => ({
    ...qualification,
    links: qualification.links?.length ? qualification.links : providerLinksForQualification(qualification),
    developsSkillIds: qualification.developsSkillIds.filter(skillId => skillIds.has(skillId)),
    preparesForOccupationIds: qualification.preparesForOccupationIds.filter(occupationId => occupationIds.has(occupationId)),
  }))
  .filter(qualification => qualification.developsSkillIds.length > 0 && qualification.preparesForOccupationIds.length > 0);

const qualifiedOccupationIds = new Set(sanitizedQualifications.flatMap(qualification => qualification.preparesForOccupationIds));
for (const occupation of OCCUPATIONS) {
  if (qualifiedOccupationIds.has(occupation.id)) continue;
  sanitizedQualifications.push({
    id: `bridge-${occupation.id}`,
    name: `${occupation.title} NSQF bridge route`,
    nsqfLevel: occupation.nsqfEntryLevel,
    type: occupation.isVocational ? 'nsqf_course' : 'certification',
    developsSkillIds: occupation.skills.slice(0, 6).map(req => req.skillId),
    preparesForOccupationIds: [occupation.id],
    typicalMonths: occupation.isVocational ? 6 : 4,
    providerHint: occupation.isVocational ? 'Skill India Digital Hub / PMKVY centre' : 'NPTEL / SWAYAM or an accredited sector provider',
    links: providerLinksForQualification({ name: `${occupation.title} NSQF bridge route`, type: occupation.isVocational ? 'nsqf_course' : 'certification' }),
  });
}

const taughtSkills = new Set(sanitizedQualifications.flatMap(qualification => qualification.developsSkillIds));
const untaughtSkills = SKILLS.filter(skill => !taughtSkills.has(skill.id));
for (let index = 0; index < untaughtSkills.length; index += 16) {
  const group = untaughtSkills.slice(index, index + 16);
  const relevantOccupations = OCCUPATIONS.filter(occupation => occupation.skills.some(req => group.some(skill => skill.id === req.skillId))).map(occupation => occupation.id);
  sanitizedQualifications.push({
    id: `cross-sector-skill-route-${index / 16 + 1}`,
    name: `Cross-sector skill development route ${index / 16 + 1}`,
    nsqfLevel: 4,
    type: 'nsqf_course',
    developsSkillIds: group.map(skill => skill.id),
    preparesForOccupationIds: relevantOccupations.length ? relevantOccupations : [OCCUPATIONS[0].id],
    typicalMonths: 3,
    providerHint: 'Skill India Digital Hub / PMKVY centre / SWAYAM',
    links: providerLinksForQualification({ name: `Cross-sector skill development route ${index / 16 + 1}`, type: 'nsqf_course' }),
  });
}

export const QUALIFICATIONS: Qualification[] = sanitizedQualifications;
export const MARKET_SIGNALS: MarketSignal[] = RAW_MARKET_SIGNALS.filter((signal, index, all) => occupationIds.has(signal.occupationId) && all.findIndex(item => item.occupationId === signal.occupationId) === index);

export const skillById = new Map<string, Skill>(SKILLS.map(skill => [skill.id, skill]));
export const occupationById = new Map<string, Occupation>(OCCUPATIONS.map(occupation => [occupation.id, occupation]));
export const qualificationById = new Map<string, Qualification>(QUALIFICATIONS.map(qualification => [qualification.id, qualification]));
export const marketById = new Map<string, MarketSignal>(MARKET_SIGNALS.map(signal => [signal.occupationId, signal]));

const transitionsFromMap = new Map<string, TransitionEdge[]>();
const transitionsToMap = new Map<string, TransitionEdge[]>();
for (const transition of TRANSITIONS) {
  transitionsFromMap.set(transition.fromId, [...(transitionsFromMap.get(transition.fromId) ?? []), transition]);
  transitionsToMap.set(transition.toId, [...(transitionsToMap.get(transition.toId) ?? []), transition]);
}

export const transitionsFrom = (occupationId: string): TransitionEdge[] => transitionsFromMap.get(occupationId) ?? [];
export const transitionsTo = (occupationId: string): TransitionEdge[] => transitionsToMap.get(occupationId) ?? [];
export const qualificationsForOccupation = (occupationId: string): Qualification[] => QUALIFICATIONS.filter(qualification => qualification.preparesForOccupationIds.includes(occupationId));
export const qualificationsForSkill = (skillId: string): Qualification[] => QUALIFICATIONS.filter(qualification => qualification.developsSkillIds.includes(skillId));
export const marketFor = (occupationId: string): MarketSignal | undefined => marketById.get(occupationId);

export const KB_STATS = { skills: SKILLS.length, occupations: OCCUPATIONS.length, transitions: TRANSITIONS.length, qualifications: QUALIFICATIONS.length, marketSignals: MARKET_SIGNALS.length, version: KB_VERSION };
export * from './schema';
