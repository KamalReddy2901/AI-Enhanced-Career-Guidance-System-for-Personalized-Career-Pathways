import { ArrowRight } from 'lucide-react';
import type { CareerPassport } from '../../engine/types';
import { useT } from '../../i18n';
import { StickFigure } from '../StickFigure';
import { Button } from '../ui/button';

export interface StaticMastheadProps {
  passport: CareerPassport | null;
  showLanding: boolean;
  onNavigate: (path: string) => void;
}

export function StaticMasthead({ passport, showLanding, onNavigate }: StaticMastheadProps) {
  const { t } = useT();
  return (
    <section id="hero" className="px-6 pb-12 pt-16 md:pb-16 md:pt-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <p className="label-caps mb-5">{t('homeKicker')}</p>
          <h1 className="font-display max-w-4xl text-5xl leading-[1.25] tracking-tighter text-[var(--ink)] md:text-6xl">
            {t('homeHeadline')}
          </h1>
          <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
            {t('homeSubhead')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={() => onNavigate(showLanding ? '/onboarding' : passport ? '/assess' : '/onboarding')}
              data-testid="home-primary-cta"
            >
              {passport ? t('homeContinue') : t('homePrimary')}
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" onClick={() => onNavigate('/job')} data-testid="home-explore-cta">
              {t('homeExplore')}
            </Button>
          </div>
        </div>
        <div className="hidden justify-self-end lg:flex lg:items-center lg:justify-center" aria-hidden="true">
          <StickFigure pose="searching" size={240} />
        </div>
      </div>
    </section>
  );
}
