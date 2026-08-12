import type { RiasecScores } from '../../engine/types';
import { motion, useReducedMotion } from 'motion/react';
const dimensions = ['R','I','A','S','E','C'] as const;
const point = (index:number,value:number,radius=68) => { const angle=-Math.PI/2+index*Math.PI/3; const scaled=radius*value/100; return `${90+Math.cos(angle)*scaled},${90+Math.sin(angle)*scaled}`; };

interface RiasecHexagonProps {
  scores: RiasecScores;
  compact?: boolean;
  onVertexClick?: (dimension: keyof RiasecScores) => void;
}

export function RiasecHexagon({ scores, compact = false, onVertexClick }: RiasecHexagonProps) {
  const reducedMotion = useReducedMotion();
  const outline = dimensions.map((_, index) => point(index, 100)).join(' ');
  const profile = dimensions.map((dimension, index) => point(index, scores[dimension])).join(' ');

  return (
    <svg
      viewBox="0 0 180 180"
      className={compact ? 'h-32 w-32' : 'mx-auto h-auto w-full max-w-[320px]'}
      role="img"
      aria-label={`RIASEC profile ${dimensions.map((dimension) => `${dimension} ${scores[dimension]}`).join(', ')}`}
    >
      {[25, 50, 75, 100].map((level) => (
        <polygon
          key={level}
          points={dimensions.map((_, index) => point(index, level)).join(' ')}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity=".12"
          strokeWidth="1"
        />
      ))}
      <motion.polygon
        points={outline}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
        initial={reducedMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeInOut' }}
      />
      <motion.polygon
        points={profile}
        fill="var(--accent-news)"
        fillOpacity=".12"
        stroke="var(--accent-news)"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 0.15 }}
      />
      {dimensions.map((dimension, index) => {
        const [x, y] = point(index, 120).split(',');
        const [vertexX, vertexY] = point(index, scores[dimension]).split(',');
        return (
          <g key={dimension}>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="label-caps" fontSize="9">
              {dimension}
            </text>
            {onVertexClick && (
              <circle
                cx={vertexX}
                cy={vertexY}
                r="9"
                fill="transparent"
                role="button"
                tabIndex={0}
                data-testid={`riasec-vertex-${dimension.toLowerCase()}`}
                aria-label={`${dimension} score ${scores[dimension]}`}
                onClick={() => onVertexClick(dimension)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onVertexClick(dimension);
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
