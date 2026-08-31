export type SkillMatchKind = 'exact' | 'alias' | 'none';

export interface SkillResolution {
  readonly skillId?: string;
  /** Canonical label for resolved skills; untouched input for unresolved text. */
  readonly label: string;
  readonly matchKind: SkillMatchKind;
}

export interface SkillReviewSuggestion {
  readonly skillId: string;
  readonly label: string;
  readonly score: number;
  readonly reviewOnly: true;
}

export type CanonicalResolutionState =
  | {
      readonly state: 'resolved';
      readonly skillId: string;
      readonly matchKind: 'exact' | 'alias';
      /** Persisted canonical label. Optional for backward compatibility; production authoring refuses resolved writes when absent. */
      readonly label?: string;
    }
  | { readonly state: 'review_required'; readonly literalText: string; readonly suggestions: readonly SkillReviewSuggestion[] }
  | { readonly state: 'unresolved'; readonly literalText: string };
