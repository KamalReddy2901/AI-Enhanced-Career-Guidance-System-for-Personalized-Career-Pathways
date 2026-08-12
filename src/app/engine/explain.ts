import { occupationById, skillById } from '../data/knowledge';
import type { CareerPassport, ComponentScore } from './types';
import { weightsFor } from './weights';

const dimensionLabels: Record<ComponentScore['dimension'], string> = {
  interest: 'interest profile', aptitude: 'aptitude screener', values: 'work values',
  skill: 'current skill coverage', transferable: 'transferable experience', experience: 'related experience',
  aspiration: 'stated aspiration', market: 'indicative market signal', progression: 'progression options',
  learningFeasibility: 'learning feasibility', geographic: 'location fit',
};

export function buildTopReasons(components: ComponentScore[]): string[] {
  return [...components]
    .filter(component => component.dataAvailable)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 3)
    .map(component => `${dimensionLabels[component.dimension]} is ${Math.round(component.score)}/100 — ${component.note}`);
}

export function buildWhyNotHigher(components: ComponentScore[]): string[] {
  return [...components]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map(component => component.dataAvailable
      ? `${dimensionLabels[component.dimension]} is currently ${Math.round(component.score)}/100; strengthening this evidence could lift the overall fit.`
      : `Complete the ${dimensionLabels[component.dimension]} module to replace the neutral score and sharpen this recommendation.`);
}

export function counterfactualDelta(passport: CareerPassport, occupationId: string, skillId: string, newProficiency: number): number {
  const occupation = occupationById.get(occupationId);
  const requirement = occupation?.skills.find(item => item.skillId === skillId);
  if (!occupation || !requirement) return 0;
  const current = passport.skills.find(claim => claim.skillId === skillId)?.proficiency ?? 0;
  const before = Math.min(current, requirement.requiredProficiency) / requirement.requiredProficiency;
  const after = Math.min(newProficiency, requirement.requiredProficiency) / requirement.requiredProficiency;
  const importanceTotal = occupation.skills.reduce((sum, item) => sum + item.importance, 0);
  return Math.round(Math.max(0, after - before) * requirement.importance / importanceTotal * 100 * weightsFor(passport.segment).skill);
}

export function counterfactualText(passport: CareerPassport, occupationId: string, currentTotal: number, skillId: string, newProficiency: number): string {
  const delta = counterfactualDelta(passport, occupationId, skillId, newProficiency);
  const name = skillById.get(skillId)?.name ?? skillId;
  return `If ${name} reaches level ${newProficiency}, the skill component improves enough to move overall fit roughly ${currentTotal} → ${Math.min(100, currentTotal + delta)}.`;
}
