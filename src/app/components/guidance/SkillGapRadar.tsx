import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { SkillGap } from '../../engine/types';
import { skillName } from '../../engine/gaps';

interface SkillGapRadarProps {
  gaps: SkillGap[];
  maxSkills?: number;
  size?: number;
}

export function SkillGapRadar({ gaps, maxSkills = 6, size = 300 }: SkillGapRadarProps) {
  const data = useMemo(() => {
    return gaps.slice(0, maxSkills).map(gap => ({
      skill: skillName(gap.skillId),
      required: gap.required * 25, // Scale 1-4 to 0-100
      current: gap.current * 25,
      gap: gap.severity,
    }));
  }, [gaps, maxSkills]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--ink-soft)] text-sm">
        No skill gaps to display
      </div>
    );
  }

  const center = size / 2;
  const radius = (size / 2) - 60; // Leave space for labels
  const angleStep = (2 * Math.PI) / data.length;

  // Generate polygon points for required and current
  const generatePoints = (values: number[]) => {
    return values.map((value, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const r = (radius * value) / 100;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const requiredPoints = generatePoints(data.map(d => d.required));
  const currentPoints = generatePoints(data.map(d => d.current));

  // Generate axis lines and labels
  const axes = data.map((item, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    
    // Label position (slightly beyond the radius)
    const labelRadius = radius + 30;
    const labelX = center + labelRadius * Math.cos(angle);
    const labelY = center + labelRadius * Math.sin(angle);
    
    return { x, y, labelX, labelY, skill: item.skill, angle };
  });

  // Generate concentric circles (skill level markers)
  const circles = [25, 50, 75, 100];

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Concentric circles */}
        {circles.map(level => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(radius * level) / 100}
            fill="none"
            stroke="var(--ink-faint)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Axes */}
        {axes.map((axis, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={axis.x}
            y2={axis.y}
            stroke="var(--ink-faint)"
            strokeWidth="1"
          />
        ))}

        {/* Required proficiency polygon */}
        <motion.polygon
          points={requiredPoints}
          fill="var(--accent-news)"
          fillOpacity="0.15"
          stroke="var(--accent-news)"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Current proficiency polygon */}
        <motion.polygon
          points={currentPoints}
          fill="var(--ink)"
          fillOpacity="0.25"
          stroke="var(--ink)"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Labels */}
        {axes.map((axis, index) => {
          // Determine text anchor based on position
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (axis.labelX > center + 10) textAnchor = 'start';
          else if (axis.labelX < center - 10) textAnchor = 'end';

          return (
            <text
              key={index}
              x={axis.labelX}
              y={axis.labelY}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="font-mono-ui text-[10px] uppercase tracking-wide fill-[var(--ink)]"
            >
              {axis.skill.length > 20 ? axis.skill.slice(0, 18) + '...' : axis.skill}
            </text>
          );
        })}

        {/* Center dot */}
        <circle cx={center} cy={center} r="3" fill="var(--ink)" />
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--accent-news)] bg-[var(--accent-news)]/15" />
          <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)]">Required</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--ink)] bg-[var(--ink)]/25" />
          <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)]">Current</span>
        </div>
      </div>
    </div>
  );
}
