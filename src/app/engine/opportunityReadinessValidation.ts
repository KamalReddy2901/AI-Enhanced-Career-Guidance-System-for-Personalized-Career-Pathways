import { HUMAN_CONFIRMATION_METHODS } from '../domain/shared';
import type { HumanConfirmationTrace } from '../domain/shared';
import type {
  OpportunityReadinessInput,
  OpportunityReadinessInputValidationIssue,
  OpportunityReadinessInputValidationResult,
} from '../domain/readiness';

const confirmationMethods = new Set<string>(HUMAN_CONFIRMATION_METHODS);

export function hasCompleteHumanConfirmationTrace(trace: HumanConfirmationTrace): boolean {
  return trace.humanConfirmed === true
    && typeof trace.confirmedByActorId === 'string'
    && trace.confirmedByActorId.trim().length > 0
    && typeof trace.confirmedAt === 'string'
    && trace.confirmedAt.trim().length > 0
    && typeof trace.confirmationMethod === 'string'
    && confirmationMethods.has(trace.confirmationMethod);
}

export function assertOpportunityRequirementConfirmed(
  requirement: OpportunityReadinessInput['opportunity']['requirements'][number],
): void {
  if (requirement.humanConfirmed && hasCompleteHumanConfirmationTrace(requirement)) return;
  const issue: OpportunityReadinessInputValidationIssue = {
    code: requirement.humanConfirmed
      ? 'INVALID_REQUIREMENT_CONFIRMATION_TRACE'
      : 'UNCONFIRMED_REQUIREMENT',
    path: 'opportunity.requirement',
    literalSourceWording: requirement.literalSourceWording,
    message: requirement.humanConfirmed
      ? 'The confirmed opportunity requirement is missing a valid actor, timestamp, or confirmation method.'
      : 'A human must confirm this opportunity requirement before normative readiness evaluation.',
  };
  throw new OpportunityReadinessInputValidationError([issue]);
}

/** Validates high-impact opportunity authoring state before any normative
 * eligibility, requirement, or readiness result is produced. */
export function validateOpportunityReadinessInput(
  input: OpportunityReadinessInput,
): OpportunityReadinessInputValidationResult {
  const issues: OpportunityReadinessInputValidationIssue[] = [];

  input.opportunity.requirements.forEach((requirement, index) => {
    if (!requirement.humanConfirmed) {
      issues.push({
        code: 'UNCONFIRMED_REQUIREMENT',
        path: `opportunity.requirements[${index}]`,
        literalSourceWording: requirement.literalSourceWording,
        message: 'A human must confirm this opportunity requirement before normative readiness computation.',
      });
    } else if (!hasCompleteHumanConfirmationTrace(requirement)) {
      issues.push({
        code: 'INVALID_REQUIREMENT_CONFIRMATION_TRACE',
        path: `opportunity.requirements[${index}]`,
        literalSourceWording: requirement.literalSourceWording,
        message: 'The confirmed opportunity requirement is missing a valid actor, timestamp, or confirmation method.',
      });
    }
  });

  input.opportunity.eligibilityRules.forEach((rule, index) => {
    if (!rule.humanConfirmed) {
      issues.push({
        code: 'UNCONFIRMED_ELIGIBILITY_RULE',
        path: `opportunity.eligibilityRules[${index}]`,
        literalSourceWording: rule.literalSourceWording,
        message: 'A human must confirm this eligibility rule before normative readiness computation.',
      });
    } else if (!hasCompleteHumanConfirmationTrace(rule)) {
      issues.push({
        code: 'INVALID_ELIGIBILITY_RULE_CONFIRMATION_TRACE',
        path: `opportunity.eligibilityRules[${index}]`,
        literalSourceWording: rule.literalSourceWording,
        message: 'The confirmed eligibility rule is missing a valid actor, timestamp, or confirmation method.',
      });
    }
  });

  return issues.length === 0
    ? { valid: true, issues: [] }
    : { valid: false, issues };
}

export class OpportunityReadinessInputValidationError extends Error {
  readonly issues: readonly OpportunityReadinessInputValidationIssue[];

  constructor(issues: readonly OpportunityReadinessInputValidationIssue[]) {
    super(`Opportunity readiness input validation failed with ${issues.length} issue(s).`);
    this.name = 'OpportunityReadinessInputValidationError';
    this.issues = issues;
  }
}

export function assertOpportunityReadinessInputConfirmed(input: OpportunityReadinessInput): void {
  const validation = validateOpportunityReadinessInput(input);
  if (!validation.valid) throw new OpportunityReadinessInputValidationError(validation.issues);
}
