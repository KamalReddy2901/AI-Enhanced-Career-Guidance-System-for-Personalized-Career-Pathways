import { motion } from 'motion/react';
import type { CareerPassport, CareerRecommendation, RecommendationSet } from '../../engine/types';
import type { RecommendationChange } from '../../context/GuidanceContext';
import { useT } from '../../i18n';
import { Button } from '../ui/button';
import { StopPress } from '../guidance/StopPress';

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
  const { t } = useT();
  const progress = passport?.completeness ?? 0;

  return (
    <>
      <StopPress changes={recommendationChanges} onDismiss={onDismissChanges} onExplain={(occupationId) => {
        const recommendation = recommendations?.recommendations.find((item) => item.occupationId === occupationId);
        if (recommendation) onExplain(recommendation);
      }} />

      <section className="px-6 py-8" aria-labelledby="home-progress-title">
        <div className="card-sketch mx-auto flex max-w-6xl flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="home-progress-title" className="font-display text-2xl">{t('homeProgress')}</h2>
              <span className="font-mono-ui text-sm">{Math.round(progress)}%</span>
            </div>
            <div className="mt-4 h-1 overflow-hidden bg-[var(--ink)]/15" role="progressbar" aria-label="Career Passport readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <motion.div className="h-full origin-left bg-[var(--ink)]" initial={{ scaleX: 0 }} whileInView={{ scaleX: progress / 100 }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => onNavigate(passport ? '/dashboard' : '/onboarding')} data-testid="home-progress-cta">
            {passport ? t('homeNext') : t('homeBegin')}
          </Button>
        </div>
      </section>
    </>
  );
}
