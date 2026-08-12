import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CareerPassport } from '../../engine/types';
import { useT } from '../../i18n';
import { useRichVisuals } from '../../hooks/useRichVisuals';
import { Magnetic } from '../../motion/Magnetic';
import { TextReveal } from '../../motion/TextReveal';
import { StickFigure } from '../StickFigure';
import { Button } from '../ui/button';

const FloatingNewsprintScene = lazy(() => import('../three/FloatingNewsprintScene').then(module => ({default:module.FloatingNewsprintScene})));

export interface StaticMastheadProps {
  passport: CareerPassport | null;
  showLanding: boolean;
  onNavigate: (path:string)=>void;
}

export function StaticMasthead({passport,showLanding,onNavigate}:StaticMastheadProps) {
  const {t}=useT();
  const richVisuals=useRichVisuals();
  return <section id="hero" className="px-6 pb-12 pt-16 md:pb-16 md:pt-24">
    <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
      <div><p className="label-caps mb-5">{t('homeKicker')}</p><h1 className="font-display max-w-4xl text-5xl leading-[1.25] tracking-tighter text-[var(--ink)] md:text-6xl"><TextReveal text={t('homeHeadline')}/></h1><p className="mt-6 max-w-[65ch] text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">{t('homeSubhead')}</p><div className="mt-8 flex flex-wrap items-center gap-4"><Magnetic><Button type="button" onClick={()=>onNavigate(showLanding?'/onboarding':passport?'/assess':'/onboarding')} data-testid="home-primary-cta" aria-label={passport?t('homeContinue'):t('homePrimary')}>{passport?t('homeContinue'):t('homePrimary')} <ArrowRight aria-hidden="true"/></Button></Magnetic><Button type="button" variant="ghost" onClick={()=>onNavigate('/job')} data-testid="home-explore-cta" aria-label={t('homeExplore')}>{t('homeExplore')}</Button></div></div>
      <div className="hidden h-[360px] w-[420px] justify-self-end lg:block" aria-hidden="true">{richVisuals?<Suspense fallback={<StickFigure pose="mapping" size={320} animated/>}><FloatingNewsprintScene/></Suspense>:<StickFigure pose="mapping" size={320} animated/>}</div>
    </div>
  </section>;
}
