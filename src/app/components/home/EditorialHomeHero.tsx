import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { CareerPassport, CareerRecommendation, RecommendationSet } from '../../engine/types';
import type { RecommendationChange } from '../../context/GuidanceContext';
import { occupationById } from '../../data/knowledge';
import { useT } from '../../i18n';
import { Magnetic } from '../../motion/Magnetic';
import { TextReveal } from '../../motion/TextReveal';
import { useReveal } from '../../motion/useReveal';
import { Button } from '../ui/button';
import { StickFigure } from '../StickFigure';
import { StopPress } from '../guidance/StopPress';
import { useRichVisuals } from '../../hooks/useRichVisuals';

const FloatingNewsprintScene = lazy(() => import('../three/FloatingNewsprintScene').then(module => ({ default: module.FloatingNewsprintScene })));

interface EditorialHomeHeroProps {
  passport: CareerPassport | null;
  recommendations: RecommendationSet | null;
  recommendationChanges: RecommendationChange[];
  showLanding: boolean;
  onNavigate: (path: string) => void;
  onExplain: (recommendation: CareerRecommendation) => void;
  onDismissChanges: () => void;
}

const pickGroups = ['SAFE', 'STRETCH', 'FRONTIER'] as const;

export function EditorialHomeHero({
  passport,
  recommendations,
  recommendationChanges,
  showLanding,
  onNavigate,
  onExplain,
  onDismissChanges,
}: EditorialHomeHeroProps) {
  const { t } = useT();
  const picks = recommendations?.recommendations.slice(0, 3) ?? [];
  const progress = passport?.completeness ?? 0;
  const reveal = useReveal<HTMLDivElement>();
  const richVisuals = useRichVisuals();

  const tools = [
    { number: '01', label: t('homeQuiz'), path: '/quiz' },
    { number: '02', label: t('homeMood'), path: '/mood' },
    { number: '03', label: t('homeCompare'), path: '/compare' },
    { number: '04', label: t('homeCounselor'), path: '/counselor' },
  ];

  return (
    <>
      <section id="hero" className="px-6 pb-12 pt-16 md:pb-16 md:pt-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="label-caps mb-5">{t('homeKicker')}</p>
            <h1 className="font-display max-w-4xl text-5xl leading-[1.05] tracking-tighter text-[var(--ink)] md:text-6xl">
              <TextReveal text={t('homeHeadline')} />
            </h1>
            <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
              {t('homeSubhead')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Button
                  type="button"
                  onClick={() => onNavigate(showLanding ? '/onboarding' : passport ? '/assess' : '/onboarding')}
                  data-testid="home-primary-cta"
                  aria-label={passport ? t('homeContinue') : t('homePrimary')}
                >
                  {passport ? t('homeContinue') : t('homePrimary')} <ArrowRight aria-hidden="true" />
                </Button>
              </Magnetic>
              <Button type="button" variant="ghost" onClick={() => onNavigate('/job')} data-testid="home-explore-cta" aria-label={t('homeExplore')}>
                {t('homeExplore')}
              </Button>
            </div>
          </div>
          <div className="hidden h-[360px] w-[420px] justify-self-end lg:block" aria-hidden="true">
            {richVisuals ? <Suspense fallback={<StickFigure pose="mapping" size={320} animated />}><FloatingNewsprintScene /></Suspense> : <StickFigure pose="mapping" size={320} animated />}
          </div>
        </div>
      </section>

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
            <div className="mt-4 h-1 overflow-hidden bg-[var(--ink)]/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
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
                    <span className={`label-caps ${index === 2 ? '!text-[var(--accent-news)]' : ''}`}>{pickGroups[index]}</span>
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
