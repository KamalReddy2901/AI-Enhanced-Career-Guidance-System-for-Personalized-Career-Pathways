import type { EligibilityEducationLevel, EligibilityRule } from '../domain/opportunity';
import type {
  EligibilityRuleResult,
  EligibilityStatus,
  ReadinessSubjectInput,
} from '../domain/readiness';

const EDUCATION_ORDER: Readonly<Record<EligibilityEducationLevel, number>> = {
  below_10: 0,
  class_10: 1,
  class_12: 2,
  iti_diploma: 3,
  undergraduate: 4,
  postgraduate: 5,
};

const normalizeLiteral = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

function result(
  ruleIndex: number,
  rule: EligibilityRule,
  state: EligibilityRuleResult['state'],
  reason: string,
): EligibilityRuleResult {
  return { ruleIndex, ruleKind: rule.kind, state, reason };
}

export function evaluateEligibilityRule(
  rule: EligibilityRule,
  subject: ReadinessSubjectInput,
  ruleIndex: number,
): EligibilityRuleResult {
  if (rule.kind === 'custom') {
    return result(ruleIndex, rule, 'NEEDS_REVIEW',
      `Manual review is required for the literal eligibility rule: "${rule.literalSourceWording}".`);
  }

  if (rule.kind === 'education_level') {
    const fact = subject.educationLevel;
    if (!fact?.confirmed) return result(ruleIndex, rule, 'NEEDS_REVIEW', 'Confirmed education level is unavailable.');
    const satisfied = rule.operator === 'equals'
      ? fact.value === rule.value
      : EDUCATION_ORDER[fact.value] >= EDUCATION_ORDER[rule.value];
    return result(ruleIndex, rule, satisfied ? 'SATISFIED' : 'FAILED',
      satisfied
        ? `Confirmed education level ${fact.value} satisfies ${rule.operator} ${rule.value}.`
        : `Confirmed education level ${fact.value} does not satisfy ${rule.operator} ${rule.value}.`);
  }

  if (rule.kind === 'graduation_year') {
    const fact = subject.graduationYear;
    if (!fact?.confirmed) return result(ruleIndex, rule, 'NEEDS_REVIEW', 'Confirmed graduation year is unavailable.');
    let satisfied: boolean;
    if (rule.operator === 'before') satisfied = fact.value < rule.value;
    else if (rule.operator === 'after') satisfied = fact.value > rule.value;
    else {
      const [fromYear, toYear] = rule.value as readonly [number, number];
      satisfied = fact.value >= fromYear && fact.value <= toYear;
    }
    return result(ruleIndex, rule, satisfied ? 'SATISFIED' : 'FAILED',
      satisfied
        ? `Confirmed graduation year ${fact.value} satisfies the ${rule.operator} rule.`
        : `Confirmed graduation year ${fact.value} does not satisfy the ${rule.operator} rule.`);
  }

  if (rule.kind === 'location') {
    const confirmedLocations = subject.physicalPresenceLocations.filter(fact => fact.confirmed).map(fact => normalizeLiteral(fact.value));
    if (!subject.physicalPresenceLocationsComplete) {
      return result(ruleIndex, rule, 'NEEDS_REVIEW', 'Confirmed physical-presence availability is incomplete.');
    }
    const allowed = new Set(rule.values.map(normalizeLiteral));
    const satisfied = rule.operator === 'in'
      ? confirmedLocations.some(location => allowed.has(location))
      : confirmedLocations.every(location => !allowed.has(location));
    return result(ruleIndex, rule, satisfied ? 'SATISFIED' : 'FAILED',
      satisfied
        ? 'Confirmed physical-presence availability satisfies the mandatory location rule.'
        : 'Confirmed physical-presence availability does not satisfy the mandatory location rule.');
  }

  if (rule.kind === 'organization_membership') {
    const matching = subject.organizationMemberships.filter(fact => rule.organizationIds.includes(fact.organizationId));
    if (matching.some(fact => fact.confirmed && fact.active)) {
      return result(ruleIndex, rule, 'SATISFIED', 'A confirmed active organization membership satisfies the rule.');
    }
    if (!subject.organizationMembershipsComplete || matching.some(fact => !fact.confirmed)) {
      return result(ruleIndex, rule, 'NEEDS_REVIEW', 'Organization membership information is incomplete or unconfirmed.');
    }
    return result(ruleIndex, rule, 'FAILED', 'The confirmed membership inventory contains no active qualifying membership.');
  }

  if (rule.kind === 'work_authorization') {
    const fact = subject.workAuthorizations.find(item => normalizeLiteral(item.jurisdiction) === normalizeLiteral(rule.jurisdiction));
    if (!fact?.confirmed) return result(ruleIndex, rule, 'NEEDS_REVIEW', `Confirmed work authorization for ${rule.jurisdiction} is unavailable.`);
    return result(ruleIndex, rule, fact.authorized ? 'SATISFIED' : 'FAILED',
      fact.authorized
        ? `Confirmed work authorization for ${rule.jurisdiction} is present.`
        : `Confirmed facts indicate work authorization for ${rule.jurisdiction} is not present.`);
  }

  if (rule.kind === 'language') {
    const language = normalizeLiteral(rule.language);
    const matching = subject.relevantLanguages.find(fact => normalizeLiteral(fact.value) === language);
    if (matching?.confirmed) return result(ruleIndex, rule, 'SATISFIED', `Confirmed ${rule.language} language capability is recorded.`);
    if (!subject.relevantLanguagesComplete || matching) {
      return result(ruleIndex, rule, 'NEEDS_REVIEW', `Confirmed ${rule.language} language information is unavailable.`);
    }
    return result(ruleIndex, rule, 'FAILED', `The confirmed language inventory does not include ${rule.language}.`);
  }

  const kind = rule.kind;
  const key = kind === 'availability'
    ? rule.factKey
    : kind === 'licence_registration'
      ? rule.licenceCode
      : rule.factKey;
  const expectedValue = rule.expectedValue;
  const fact = subject.eligibilityFacts.find(item => item.kind === kind && normalizeLiteral(item.key) === normalizeLiteral(key));
  if (!fact?.confirmed) {
    return result(ruleIndex, rule, 'NEEDS_REVIEW', `Confirmed ${kind.replaceAll('_', ' ')} fact "${key}" is unavailable.`);
  }
  const satisfied = typeof expectedValue === 'string' && typeof fact.value === 'string'
    ? normalizeLiteral(expectedValue) === normalizeLiteral(fact.value)
    : expectedValue === fact.value;
  return result(ruleIndex, rule, satisfied ? 'SATISFIED' : 'FAILED',
    satisfied
      ? `Confirmed ${kind.replaceAll('_', ' ')} fact "${key}" satisfies the rule.`
      : `Confirmed ${kind.replaceAll('_', ' ')} fact "${key}" does not satisfy the rule.`);
}

export function evaluateEligibility(
  rules: readonly EligibilityRule[],
  subject: ReadinessSubjectInput,
): { status: EligibilityStatus; ruleResults: EligibilityRuleResult[] } {
  const ruleResults = rules.map((rule, index) => evaluateEligibilityRule(rule, subject, index));
  const status: EligibilityStatus = ruleResults.some(item => item.state === 'FAILED')
    ? 'NOT_CURRENTLY_ELIGIBLE'
    : ruleResults.some(item => item.state === 'NEEDS_REVIEW')
      ? 'NEEDS_REVIEW'
      : 'ELIGIBLE';
  return { status, ruleResults };
}
