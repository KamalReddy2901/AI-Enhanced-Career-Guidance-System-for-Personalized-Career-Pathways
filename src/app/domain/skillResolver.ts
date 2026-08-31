import { skillById } from '../data/knowledge';
import { REVIEWED_SIH_SKILL_ALIASES } from './reviewedSkillAliases';
import type { SkillResolution, SkillReviewSuggestion } from './skillResolution';

const comparisonKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

const canonicalByLabel = new Map(
  [...skillById.entries()].map(([skillId, skill]) => [comparisonKey(skill.name), { skillId, label: skill.name }]),
);

const reviewedAliasByLabel = new Map(
  Object.entries(REVIEWED_SIH_SKILL_ALIASES).map(([alias, skillId]) => [comparisonKey(alias), skillId]),
);

/** Exact canonical labels and reviewed aliases are the only automatic paths. */
export function resolveSkill(text: string): SkillResolution {
  const literal = text.trim();
  if (!literal) return { label: literal, matchKind: 'none' };

  const exact = canonicalByLabel.get(comparisonKey(literal));
  if (exact) return { skillId: exact.skillId, label: exact.label, matchKind: 'exact' };

  const aliasSkillId = reviewedAliasByLabel.get(comparisonKey(literal));
  const aliasSkill = aliasSkillId ? skillById.get(aliasSkillId) : undefined;
  if (aliasSkillId && aliasSkill) {
    return { skillId: aliasSkillId, label: aliasSkill.name, matchKind: 'alias' };
  }

  return { label: literal, matchKind: 'none' };
}

const tokens = (value: string) => new Set(comparisonKey(value).split(/[^a-z0-9+#]+/).filter(token => token.length >= 3));

/** Suggestions are review-only and never feed `resolveSkill` automatically. */
export function suggestSkillResolutions(text: string, limit = 3): SkillReviewSuggestion[] {
  const inputTokens = tokens(text);
  if (inputTokens.size === 0) return [];
  return [...skillById.entries()]
    .map(([skillId, skill]) => {
      const candidateTokens = tokens(skill.name);
      const overlap = [...inputTokens].filter(token => candidateTokens.has(token)).length;
      const union = new Set([...inputTokens, ...candidateTokens]).size;
      return { skillId, label: skill.name, score: union ? overlap / union : 0, reviewOnly: true as const };
    })
    .filter(candidate => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, Math.max(0, limit));
}
