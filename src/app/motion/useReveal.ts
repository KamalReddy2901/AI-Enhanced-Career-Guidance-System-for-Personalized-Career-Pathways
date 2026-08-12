import { useRef } from 'react';
import { useInView, useReducedMotion, type Variants } from 'motion/react';

const visibleItem = { opacity: 1, y: 0 };

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();
  const isInView = useInView(ref, {
    once: true,
    margin: '0px 0px -15% 0px',
  });

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: reducedMotion ? undefined : {
        staggerChildren: 0.08,
        delayChildren: 0.04,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: reducedMotion ? visibleItem : { opacity: 0, y: 28 },
    visible: {
      ...visibleItem,
      transition: reducedMotion ? { duration: 0 } : {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return {
    ref,
    reducedMotion: Boolean(reducedMotion),
    animate: isInView ? 'visible' : 'hidden',
    containerVariants,
    itemVariants,
  } as const;
}
