import { ArrowRight, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import type { CareerPassport } from '../../engine/types';
import { useT } from '../../i18n';
import { StickFigure } from '../StickFigure';
import { ScrollingTitles } from '../ScrollingTitles';
import { Button } from '../ui/button';

export interface WordCloudMastheadProps {
  passport: CareerPassport | null;
  showLanding: boolean;
  onNavigate: (path: string) => void;
}

export function WordCloudMasthead({ passport, showLanding, onNavigate }: WordCloudMastheadProps) {
  const { t, lang } = useT();

  const labels =
    lang === 'hi'
      ? ['योग्यता', 'आकांक्षा', 'क्षमता']
      : lang === 'te'
      ? ['ప్రతిభ', 'ఆకాంక్ష', 'సామర్థ్యం']
      : ['aptitude', 'aspiration', 'ability'];

  const primaryPath = showLanding ? '/onboarding' : passport ? '/assess' : '/onboarding';

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden bg-[var(--paper)]" data-testid="hero-section">
      {/* ── Word-cloud background ── */}
      <ScrollingTitles />

      {/* ── Centred content ── */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Stick figure + annotations */}
          <div className="relative mb-6 flex justify-center">
            <StickFigure pose="searching" size={96} />
            {/* Annotations floating beside figure */}
            <div className="absolute left-[6.5rem] top-1 hidden space-y-4 sm:flex sm:flex-col">
              {labels.map((label, i) => (
                <motion.span
                  key={label}
                  className="flex items-center gap-1.5 font-[JetBrains_Mono] text-[0.65rem] italic text-[var(--ink-soft)]"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.12 }}
                >
                  <svg width="22" height="8" viewBox="0 0 24 8" aria-hidden="true">
                    <path d="M1 6C8 1 14 7 23 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {label}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Kicker */}
          <motion.p
            className="label-caps mb-5 text-[var(--ink-soft)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('homeKicker')}
          </motion.p>

          {/* Main headline */}
          <h1
            className="font-display max-w-3xl text-4xl leading-[1.2] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl"
          >
            {t('homeHeadline')}
          </h1>

          {/* Rule */}
          <motion.div
            className="my-5 h-px w-20 bg-[var(--ink)]/25"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          />

          {/* Subhead */}
          <p
            className="max-w-xl text-base leading-relaxed text-[var(--ink-soft)] md:text-lg"
          >
            {t('homeSubhead')}
          </p>

          {/* CTAs */}
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Button
              type="button"
              data-testid="hero-primary-cta"
              onClick={() => onNavigate(primaryPath)}
            >
              {passport ? t('homeContinue') : t('homePrimary')}
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              data-testid="hero-explore-cta"
              onClick={() => onNavigate('/job')}
            >
              {t('homeExplore')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 1.2 }}
          aria-hidden="true"
        >
          <span className="label-caps text-[var(--ink-soft)]" style={{ fontSize: '0.58rem' }}>
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown size={15} className="text-[var(--ink-soft)]" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
