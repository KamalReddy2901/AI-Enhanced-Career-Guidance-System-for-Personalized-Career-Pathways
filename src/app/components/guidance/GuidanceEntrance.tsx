import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

export function GuidanceEntrance({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .28, delay }}>{children}</motion.div>;
}
