import { motion } from 'motion/react';
import { useMemo } from 'react';

const RIBBON_MESSAGES = [
  'Discover your perfect career match',
  'Structured exploratory guidance',
  'Build your personalized pathway',
  'Explore 100+ career options',
  'Your career, your story',
  'Turn potential into progress',
  'Find work that fits you',
  'Evidence-based recommendations',
];

interface FixedRibbonProps {
  className?: string;
  messages?: string[];
}

export function FixedRibbon({ className = '', messages: customMessages }: FixedRibbonProps) {
  const messages = useMemo(() => {
    const baseMessages = customMessages ?? RIBBON_MESSAGES;
    // Create 3 copies for seamless loop
    return [...baseMessages, ...baseMessages, ...baseMessages];
  }, [customMessages]);

  return (
    <div className={`w-full overflow-hidden bg-[var(--accent-news)] ${className}`}>
      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: [0, '-33.333%'],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 40,
            ease: 'linear',
          },
        }}
      >
        {messages.map((message, i) => (
          <div
            key={i}
            className="inline-flex items-center px-8 py-2"
          >
            <span className="font-mono-ui text-xs uppercase tracking-[0.15em] text-white">
              {message}
            </span>
            <span className="mx-4 text-white/40">•</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
