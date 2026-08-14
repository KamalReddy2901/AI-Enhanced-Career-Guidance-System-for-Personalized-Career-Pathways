import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../../motion/gsap';
import { useT } from '../../i18n';
import { StickFigure } from '../StickFigure';
import { FloatingNewsprintScene } from '../three/FloatingNewsprintScene';
import { Button } from '../ui/button';
import { sounds } from '../../utils/sounds';

interface ShowpieceHeroProps {
  hasPassport: boolean;
  showLanding: boolean;
  onNavigate: (path: string) => void;
  onFallback: () => void;
}

export function ShowpieceHero({ hasPassport, showLanding, onNavigate, onFallback }: ShowpieceHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const scrollProgress = useRef(0);
  const paperCue = useRef(false);
  const { t, lang } = useT();

  useGSAP(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const words = headlineRef.current?.querySelectorAll('[data-hero-word]');
    const load = gsap.timeline();
    load.fromTo('[data-kicker-char]', { opacity: 0 }, { opacity: 1, duration: .018, stagger: .018 })
      .to('[data-kicker-caret]', {opacity:0,duration:.18,repeat:3,yoyo:true})
      .fromTo(words ?? [], { yPercent: 110 }, { yPercent: 0, stagger: .05, duration: .7, ease: 'power4.out' }, .15)
      .fromTo('[data-hero-rule]', { scaleX: 0 }, { scaleX: 1, stagger: .05, duration: .55, ease: 'power3.out' }, .25)
      .fromTo('[data-hero-actions]', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .4 }, .25);

    const timeline = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=250%', pin: true, scrub: .8, onUpdate:self=>{scrollProgress.current=self.progress;if(self.progress>=.2&&!paperCue.current){paperCue.current=true;sounds.slide();}if(self.progress<.2&&paperCue.current){paperCue.current=false;sounds.slide();}}, onLeave:()=>gsap.set('[data-headline-block],[data-sheets]',{willChange:'auto'}), onEnterBack:()=>gsap.set('[data-headline-block],[data-sheets]',{willChange:'transform'}) },
      defaults: { ease: 'none' },
    });
    timeline.to('[data-scroll-cue]', { opacity: 0, duration: .05 }, 0)
      .to('[data-progress-ink]', { scaleY: 1, duration: 1 }, 0)
      .to('[data-sheets]', { xPercent: -16, yPercent: 4, scale: .82, rotate: -2, duration: .4 }, 0)
      .to('[data-headline-block]', { yPercent: -6, scale: .92, opacity: .9, duration: .3 }, .4)
      .fromTo('[data-figure] path, [data-figure] line, [data-figure] circle', { strokeDasharray: 500, strokeDashoffset: 500 }, { strokeDashoffset: 0, stagger: .015, duration: .3 }, .4)
      .fromTo('[data-annotation]', { x: -8, opacity: 0 }, { x: 0, opacity: 1, stagger: .04, duration: .18 }, .5)
      .to('[data-sheets]', { xPercent: 85, rotate: 8, opacity: 0, duration: .3 }, .7)
      .to('[data-bottom-rule]', { scaleX: 1, duration: .05 }, .95);

    const quickX = gsap.quickTo('[data-cursor-dot]', 'x', { duration: .25, ease: 'power3.out' });
    const quickY = gsap.quickTo('[data-cursor-dot]', 'y', { duration: .25, ease: 'power3.out' });
    const move = (event: PointerEvent) => { quickX(event.clientX); quickY(event.clientY); };
    const enter=()=>gsap.set('[data-cursor-dot]',{opacity:1});
    const leave=()=>gsap.set('[data-cursor-dot]',{opacity:0});
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerenter',enter);hero.addEventListener('pointerleave',leave);

    let frames = 0;
    const started = performance.now();
    const fpsFuse = () => {
      frames += 1;
      if (frames !== 90) return;
      const fps = 90000 / (performance.now() - started);
      if (fps < 40) {
        timeline.scrollTrigger?.kill(true);
        timeline.kill();
        onFallback();
      }
      gsap.ticker.remove(fpsFuse);
    };
    gsap.ticker.add(fpsFuse);
    return () => { hero.removeEventListener('pointermove', move);hero.removeEventListener('pointerenter',enter);hero.removeEventListener('pointerleave',leave); gsap.ticker.remove(fpsFuse); load.kill(); timeline.scrollTrigger?.kill(); timeline.kill(); };
  }, { scope: heroRef, dependencies: [lang] });

  const target = showLanding ? '/onboarding' : hasPassport ? '/dashboard' : '/onboarding';
  const words = t('homeHeadline').split(/\s+/);
  const kicker=t('homeKicker');
  const labels=lang==='hi'?['योग्यता','आकांक्षा','क्षमता']:lang==='te'?['ప్రతిభ','ఆకాంక్ష','సామర్థ్యం']:['aptitude','aspiration','ability'];
  const scrollCue=lang==='hi'?'केस खोलने के लिए स्क्रॉल करें':lang==='te'?'కేసు తెరవడానికి స్క్రోల్ చేయండి':'Scroll to open the case';
  return <section ref={heroRef} data-testid="showpiece-hero" className="relative min-h-screen overflow-hidden bg-[var(--paper)] px-6 pt-20">
    <div data-progress-ink className="fixed left-0 top-0 z-40 h-screen w-0.5 origin-top scale-y-0 bg-[var(--ink)]" />
    <div data-cursor-dot className="pointer-events-none fixed left-0 top-0 z-50 h-2 w-2 rounded-full bg-[var(--ink)]" />
    <div className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_42%]">
      <div data-headline-block className="relative z-10 origin-left will-change-transform">
        <p data-hero-kicker className="label-caps mb-5" aria-label={kicker}>{[...kicker].map((character,index)=><span data-kicker-char aria-hidden="true" key={`${character}-${index}`}>{character}</span>)}<span data-kicker-caret aria-hidden="true">▌</span></p>
        <h1 ref={headlineRef} className="font-display text-6xl leading-[1.25] tracking-tighter">
          {words.map((word,index)=><span key={`${lang}-${word}-${index}`} className="mr-[.22em] inline-block overflow-hidden align-bottom"><span data-hero-word className="inline-block">{word}</span><i data-hero-rule className="block h-px origin-left bg-[var(--ink)]" /></span>)}
        </h1>
        <p className="mt-6 max-w-[65ch] text-[var(--ink-soft)]">{t('homeSubhead')}</p>
        <div data-hero-actions className="mt-8 flex flex-wrap gap-4">
          <Button data-testid="hero-primary-cta" onClick={()=>onNavigate(target)}>{hasPassport?t('homeContinue'):t(showLanding?'homePrimary':'homeSetup')} <ArrowRight/></Button>
          <Button variant="ghost" data-testid="hero-explore-cta" aria-label={t('homeExplore')} onClick={()=>onNavigate('/job?fresh=1')}>{t('homeExplore')}</Button>
        </div>
      </div>
      <div data-sheets className="h-[440px] will-change-transform" aria-hidden="true"><FloatingNewsprintScene progressRef={scrollProgress} wordmark={t('homeHeadline')}/></div>
    </div>
    <div data-figure className="pointer-events-none absolute bottom-16 left-[44%] z-10 opacity-90"><StickFigure pose="walking" size={150}/><div className="absolute left-32 top-2 space-y-4 font-[JetBrains_Mono] text-xs italic">{labels.map(label=><span data-annotation className="flex items-center gap-2" key={label}><svg width="24" height="8" viewBox="0 0 24 8"><path d="M1 6C8 1 14 7 23 2" fill="none" stroke="currentColor"/></svg>{label}</span>)}</div></div>
    <div data-scroll-cue data-testid="hero-scroll-cue" className="label-caps absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2">{scrollCue} <svg className="h-6 w-4 animate-bounce" viewBox="0 0 16 24" aria-hidden="true"><motion.path d="M8 1v18m-5-5 5 6 5-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:.6,delay:.7}}/></svg></div>
    <div data-bottom-rule className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[var(--ink)]"/>
  </section>;
}
