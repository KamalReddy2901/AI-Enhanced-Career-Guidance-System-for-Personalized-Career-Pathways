import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { CareerPassport, CareerRecommendation, RecommendationSet } from '../../engine/types';
import type { RecommendationChange } from '../../context/GuidanceContext';
import { occupationById } from '../../data/knowledge';
import { useT } from '../../i18n';
import { useReveal } from '../../motion/useReveal';
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

const pickGroups = ['SAFE', 'STRETCH', 'FRONTIER'] as const;

export function EditorialHomeHero({
  passport,
  recommendations,
  recommendationChanges,
  onNavigate,
  onExplain,
  onDismissChanges,
}: EditorialHomeHeroProps) {
  const { t } = useT();
  const picks = recommendations?.recommendations.slice(0, 3) ?? [];
  const progress = passport?.completeness ?? 0;
  const reveal = useReveal<HTMLDivElement>();

  const tools = [
    { number: '01', label: t('homeQuiz'), path: '/quiz' },
    { number: '02', label: t('homeMood'), path: '/mood' },
    { number: '03', label: t('homeCompare'), path: '/compare' },
    { number: '04', label: t('homeCounselor'), path: '/counselor' },
  ];

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
            <div className="mt-4 h-1 overflow-hidden bg-[var(--ink)]/15" role="progressbar" aria-label="Assessment completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <motion.div className="h-full origin-left bg-[var(--ink)]" initial={{ scaleX: 0 }} whileInView={{ scaleX: progress / 100 }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => onNavigate(passport ? '/assess' : '/onboarding')} data-testid="home-progress-cta">
            {passport ? t('homeNext') : t('homeBegin')} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </section>

      {picks.length > 0 && (
        <section className="px-6 py-16 md:py-24" aria-labelledby="home-picks-title">
          <div className="mx-auto max-w-6xl">
            <div className="rule-top pt-3"><span className="label-caps">SECTION 01 — {t('homePicks')}</span></div>
            <h2 id="home-picks-title" className="font-display mt-3 text-2xl tracking-tight md:text-3xl">{t('homePicks')}</h2>
            <motion.div ref={reveal.ref} variants={reveal.containerVariants} initial="hidden" animate={reveal.animate} className="mt-8 grid gap-6 md:grid-cols-12">
              {picks.map((item, index) => {
                const occupation = occupationById.get(item.occupationId);
                return (
                  <motion.button
                    key={item.occupationId}
                    type="button"
                    variants={reveal.itemVariants}
                    onClick={() => onExplain(item)}
                    className={`card-sketch group p-6 text-left transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_var(--ink)] md:p-8 ${index === 0 ? 'card-sketch--wobble md:col-span-7 md:row-span-2' : 'md:col-span-5'}`}
                    data-testid={`home-pick-${item.occupationId}`}
                    aria-label={`${occupation?.title ?? item.occupationId}, ${Math.round(item.totalScore)} percent match`}
                  >
                    <span className={`label-caps ${index === 2 ? 'border-l-4 border-[var(--accent-news)] pl-2' : ''}`}>{pickGroups[index]}</span>
                    <h3 className={`font-display mt-4 ${index === 0 ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>{occupation?.title ?? item.occupationId}</h3>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--ink-soft)]">{item.topReasons[0]}</p>
                    <span className="font-mono-ui mt-8 block text-2xl">{Math.round(item.totalScore)}%</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      <section className="px-6 py-16 md:py-24" aria-labelledby="home-tools-title">
        <div className="mx-auto max-w-6xl">
          <div className="rule-top pt-3"><span className="label-caps">SECTION 02 — {t('homeTools')}</span></div>
          <h2 id="home-tools-title" className="font-display mt-3 text-2xl tracking-tight md:text-3xl">{t('homeTools')}</h2>
          <div className="mt-8">
            {tools.map((tool) => (
              <button key={tool.path} type="button" onClick={() => onNavigate(tool.path)} className="group rule-top flex w-full items-center gap-6 py-5 text-left" data-testid={`home-tool-${tool.number}`} aria-label={tool.label}>
                <span className="font-mono-ui text-xs text-[var(--ink-faint)]">{tool.number}</span>
                <span className="font-display flex-1 text-xl md:text-2xl">{tool.label}</span>
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" strokeWidth={1.5} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
