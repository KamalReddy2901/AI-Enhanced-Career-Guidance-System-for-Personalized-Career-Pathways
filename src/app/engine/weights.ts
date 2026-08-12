import type { FitDimension, Segment } from "./types";

export const FIT_DIMENSIONS: FitDimension[] = [
  "interest",
  "aptitude",
  "values",
  "skill",
  "transferable",
  "experience",
  "aspiration",
  "market",
  "progression",
  "learningFeasibility",
  "geographic",
];

export const SEGMENT_WEIGHTS: Record<Segment, Record<FitDimension, number>> = {
  school_student: {
    interest: 0.24,
    aptitude: 0.22,
    values: 0.08,
    skill: 0.04,
    transferable: 0.02,
    experience: 0,
    aspiration: 0.12,
    market: 0.06,
    progression: 0.08,
    learningFeasibility: 0.06,
    geographic: 0.08,
  },
  college_student: {
    interest: 0.18,
    aptitude: 0.16,
    values: 0.08,
    skill: 0.1,
    transferable: 0.04,
    experience: 0.02,
    aspiration: 0.12,
    market: 0.1,
    progression: 0.08,
    learningFeasibility: 0.08,
    geographic: 0.04,
  },
  job_seeker: {
    interest: 0.1,
    aptitude: 0.1,
    values: 0.06,
    skill: 0.18,
    transferable: 0.1,
    experience: 0.08,
    aspiration: 0.08,
    market: 0.16,
    progression: 0.06,
    learningFeasibility: 0.06,
    geographic: 0.02,
  },
  career_switcher: {
    interest: 0.08,
    aptitude: 0.08,
    values: 0.1,
    skill: 0.12,
    transferable: 0.22,
    experience: 0.1,
    aspiration: 0.08,
    market: 0.08,
    progression: 0.04,
    learningFeasibility: 0.08,
    geographic: 0.02,
  },
  professional: {
    interest: 0.06,
    aptitude: 0.06,
    values: 0.1,
    skill: 0.16,
    transferable: 0.12,
    experience: 0.2,
    aspiration: 0.08,
    market: 0.08,
    progression: 0.1,
    learningFeasibility: 0.02,
    geographic: 0.02,
  },
};

export function weightsFor(segment: Segment): Record<FitDimension, number> {
  return { ...SEGMENT_WEIGHTS[segment] };
}

export function validateWeights(): string[] {
  return (
    Object.entries(SEGMENT_WEIGHTS) as [Segment, Record<FitDimension, number>][]
  ).flatMap(([segment, weights]) =>
    Math.abs(
      Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1,
    ) > 1e-9
      ? [`${segment} weights do not sum to 1`]
      : [],
  );
}
