import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';

interface ScoreBarProps {
  value: number;
  label?: string;
}

export function ScoreBar({ value, label }: ScoreBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reducedMotion = useReducedMotion();
  const clampedValue = Math.max(0, Math.min(100, value));
  const [displayValue, setDisplayValue] = useState(reducedMotion ? Math.round(clampedValue) : 0);

  useEffect(() => {
    if (!isInView) return;
    if (reducedMotion) {
      setDisplayValue(Math.round(clampedValue));
      return;
    }

    const controls = animate(0, clampedValue, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [clampedValue, isInView, reducedMotion]);

  return (
    <div ref={ref}>
      <div className="font-mono-ui flex justify-between text-[10px] uppercase tracking-wide">
        <span>{label}</span>
        <span>{displayValue}</span>
      </div>
      <div
        className="relative mt-2 h-3 border border-[var(--ink)]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedValue)}
      >
        <motion.div
          className="absolute inset-y-0 left-0 w-full origin-left bg-[var(--ink)]"
          initial={{ scaleX: reducedMotion ? clampedValue / 100 : 0 }}
          animate={{ scaleX: isInView ? clampedValue / 100 : 0 }}
          transition={reducedMotion ? { duration: 0 } : {
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>
    </div>
  );
}
