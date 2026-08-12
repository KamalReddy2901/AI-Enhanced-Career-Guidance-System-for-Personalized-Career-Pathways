import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// GSAP is intentionally reserved for scrub-pinned scroll experiences.
// All other product motion lives in motion/react.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const EASE = {
  out: 'power3.out',
  outHard: 'power4.out',
  inOut: 'power2.inOut',
  elastic: 'back.out(1.4)',
} as const;

export const DUR = {
  xs: 0.18,
  sm: 0.3,
  md: 0.55,
  lg: 0.8,
} as const;

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
