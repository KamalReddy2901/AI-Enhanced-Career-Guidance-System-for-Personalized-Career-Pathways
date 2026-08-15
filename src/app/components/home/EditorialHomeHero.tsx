import type { CareerPassport, CareerRecommendation, RecommendationSet } from '../../engine/types';
import type { RecommendationChange } from '../../context/GuidanceContext';

interface EditorialHomeHeroProps {
  passport: CareerPassport | null;
  recommendations: RecommendationSet | null;
  recommendationChanges: RecommendationChange[];
  onNavigate: (path: string) => void;
  onExplain: (recommendation: CareerRecommendation) => void;
  onDismissChanges: () => void;
}

export function EditorialHomeHero({
  passport,
  recommendations,
  recommendationChanges,
  onNavigate,
  onExplain,
  onDismissChanges,
}: EditorialHomeHeroProps) {
  return (
    <>
      {/* StopPress removed from homepage per user request - shown on other pages */}
      {/* "Your progress" section removed from homepage per user request */}
    </>
  );
}
