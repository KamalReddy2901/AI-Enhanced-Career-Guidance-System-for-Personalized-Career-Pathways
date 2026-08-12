import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { JOB_TITLES } from '../data/jobs';

interface ScrollingTitlesProps {
  highlightedJob?: string | null;
  paused?: boolean;
  dimmed?: boolean;
}

export function ScrollingTitles({ highlightedJob, paused = false, dimmed = false }: ScrollingTitlesProps) {
  const rows = useMemo(() => {
    const shuffled = [...JOB_TITLES].sort(() => Math.random() - 0.5);
    const rowCount = 12;
    const perRow = Math.ceil(shuffled.length / rowCount);
    return Array.from({ length: rowCount }, (_, i) => {
      const start = (i * perRow) % shuffled.length;
      const titles: { text: string; size: number }[] = [];
      for (let j = 0; j < perRow + 5; j++) {
        titles.push({
          text: shuffled[(start + j) % shuffled.length],
          size: 0.85 + ((start + j) % 7) * 0.06,
        });
      }
      return { titles: [...titles, ...titles], direction: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right', speed: 20 + (i % 4) * 8 };
    });
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${dimmed ? 'opacity-[0.06]' : 'opacity-[0.12]'}`}>
      <div className="flex flex-col justify-around h-full py-4">
        {rows.map((row, i) => (
          <ScrollRow
            key={i}
            titles={row.titles}
            direction={row.direction}
            speed={row.speed}
            paused={paused}
            highlightedJob={highlightedJob}
          />
        ))}
      </div>
    </div>
  );
}

function ScrollRow({
  titles,
  direction,
  speed,
  paused,
  highlightedJob,
}: {
  titles: { text: string; size: number }[];
  direction: 'left' | 'right';
  speed: number;
  paused: boolean;
  highlightedJob?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative overflow-hidden whitespace-nowrap" ref={containerRef}>
      <motion.div
        className="inline-flex gap-8"
        animate={paused ? {} : {
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={paused ? {} : {
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: speed,
            ease: 'linear',
          },
        }}
      >
        {titles.map((item, j) => {
          const isHighlighted = highlightedJob && item.text.toLowerCase() === highlightedJob.toLowerCase();
          return (
            <span
              key={`${item.text}-${j}`}
              className={`inline-block px-4 py-1 font-[Playfair_Display] whitespace-nowrap select-none transition-[color,background-color,border-color,opacity,transform,box-shadow] duration-500 ${
                isHighlighted
                  ? 'text-black opacity-100 bg-amber-200/80 rounded px-3 py-0.5 scale-110'
                  : 'text-black/80'
              }`}
              style={{ fontSize: `${item.size}rem` }}
            >
              {item.text}
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}
