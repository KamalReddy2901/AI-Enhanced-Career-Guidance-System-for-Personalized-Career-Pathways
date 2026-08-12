import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface TextRevealProps {
  text: string;
  className?: string;
}

export function TextReveal({ text, className = '' }: TextRevealProps) {
  const reducedMotion = useReducedMotion();
  const words = useMemo(() => text.trim().split(/\s+/u), [text]);

  return (
    <span className={`inline-flex flex-wrap gap-x-[0.25em] ${className}`} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${text}-${word}-${index}`} className="inline-block overflow-hidden" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={reducedMotion ? false : { y: '110%' }}
            animate={{ y: 0 }}
            transition={reducedMotion ? { duration: 0 } : {
              duration: 0.8,
              delay: index * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
