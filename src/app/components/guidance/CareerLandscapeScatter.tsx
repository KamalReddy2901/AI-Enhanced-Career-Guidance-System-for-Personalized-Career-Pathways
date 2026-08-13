import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react';
import type { CareerRecommendation } from '../../engine/types';
import { occupationById } from '../../data/knowledge';

interface CareerLandscapeScatterProps {
  recommendations: CareerRecommendation[];
  onCareerClick?: (recommendation: CareerRecommendation) => void;
  highlightedId?: string;
  className?: string;
}

interface ScatterPoint {
  id: string;
  x: number; // Accessibility (0-100, higher = easier transition)
  y: number; // Reward potential (0-100, higher = better reward)
  size: number; // Match score
  color: string;
  recommendation: CareerRecommendation;
}

const THEME_COLORS: Record<string, string> = {
  'analytical': '#3b82f6',
  'creative': '#8b5cf6',
  'people': '#10b981',
  'hands_on': '#ef4444',
  'enterprising': '#f59e0b',
  'structured': '#06b6d4',
  'default': '#6b7280',
};

export function CareerLandscapeScatter({
  recommendations,
  onCareerClick,
  highlightedId,
  className = '',
}: CareerLandscapeScatterProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);

  const scatterPoints = useMemo<ScatterPoint[]>(() => {
    return recommendations.map(rec => {
      const occupation = occupationById.get(rec.occupationId);
      if (!occupation) return null;

      // Find skill gap component
      const skillGapComponent = rec.components.find(c => c.dimension === 'skill');
      // Accessibility: inverse of skill gap (higher gap = harder = lower accessibility)
      const accessibility = 100 - (skillGapComponent?.score || 50);
      
      // Reward potential: combination of compensation profile and market demand
      const compensationScore = occupation.valuesProfile.compensation || 50;
      const marketComponent = rec.components.find(c => c.dimension === 'market');
      const growthScore = marketComponent?.score || 50;
      const rewardPotential = (compensationScore * 0.6) + (growthScore * 0.4);
      
      // Get theme color based on cluster
      const color = THEME_COLORS[occupation.cluster] || THEME_COLORS.default;

      return {
        id: occupation.id,
        x: Math.max(0, Math.min(100, accessibility)),
        y: Math.max(0, Math.min(100, rewardPotential)),
        size: rec.totalScore,
        color,
        recommendation: rec,
      };
    }).filter((p): p is ScatterPoint => p !== null);
  }, [recommendations]);

  // SVG dimensions
  const width = 600;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Quadrant lines at 50,50
  const midX = padding.left + chartWidth / 2;
  const midY = padding.top + chartHeight / 2;

  return (
    <div className={`relative ${className}`}>
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--ink-soft)]" />
          <span className="text-[var(--ink-soft)]">Size = Match Score</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[var(--ink-soft)]" />
          <span className="text-[var(--ink-soft)]">Color = Career Theme</span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width={width}
        height={height}
        className="border border-[var(--ink-faint)] bg-[var(--paper-raised)]"
        role="img"
        aria-label="Career landscape scatter plot"
      >
        {/* Y-axis label */}
        <text
          x={20}
          y={height / 2}
          textAnchor="middle"
          className="fill-[var(--ink-soft)]"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ui)' }}
          transform={`rotate(-90 20 ${height / 2})`}
        >
          REWARD POTENTIAL →
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          className="fill-[var(--ink-soft)]"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ui)' }}
        >
          ACCESSIBILITY (EASE OF TRANSITION) →
        </text>

        {/* Grid lines */}
        <g opacity="0.1">
          {[0, 25, 50, 75, 100].map(value => {
            const x = padding.left + (value / 100) * chartWidth;
            const y = padding.top + chartHeight - (value / 100) * chartHeight;
            return (
              <g key={value}>
                {/* Vertical grid line */}
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartHeight}
                  stroke="var(--ink)"
                  strokeWidth="1"
                />
                {/* Horizontal grid line */}
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="var(--ink)"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </g>

        {/* Quadrant labels */}
        <g style={{ fontSize: '10px', fontFamily: 'var(--font-mono-ui)' }}>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.25}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            High Reward
          </text>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.25 + 12}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Hard Transition
          </text>

          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.25}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            High Reward
          </text>
          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.25 + 12}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Easy Transition
          </text>

          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.75}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Lower Reward
          </text>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.75 + 12}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Hard Transition
          </text>

          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.75}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Lower Reward
          </text>
          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.75 + 12}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Easy Transition
          </text>
        </g>

        {/* Quadrant divider lines */}
        <g opacity="0.3">
          <line
            x1={midX}
            y1={padding.top}
            x2={midX}
            y2={padding.top + chartHeight}
            stroke="var(--ink)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <line
            x1={padding.left}
            y1={midY}
            x2={padding.left + chartWidth}
            y2={midY}
            stroke="var(--ink)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        </g>

        {/* Scatter points */}
        {scatterPoints.map(point => {
          const cx = padding.left + (point.x / 100) * chartWidth;
          const cy = padding.top + chartHeight - (point.y / 100) * chartHeight;
          const radius = 4 + (point.size / 100) * 12; // 4-16px radius based on score
          const isHighlighted = point.id === highlightedId;
          const isHovered = hoveredPoint?.id === point.id;

          return (
            <g key={point.id}>
              {/* Hover/highlight ring */}
              {(isHighlighted || isHovered) && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius + 6}
                  fill="none"
                  stroke={point.color}
                  strokeWidth="2"
                  opacity="0.4"
                />
              )}

              {/* Main point */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={point.color}
                opacity={isHighlighted || isHovered ? 1 : 0.7}
                style={{ cursor: 'pointer' }}
                whileHover={{ scale: 1.2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onCareerClick?.(point.recommendation)}
              >
                <title>{occupationById.get(point.recommendation.occupationId)?.title || point.id}</title>
              </motion.circle>
            </g>
          );
        })}

        {/* Axis borders */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
        />
      </svg>

      {/* Hover tooltip */}
      {hoveredPoint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper-raised)] p-4"
        >
          <h4 className="mb-2 font-semibold text-sm">
            {occupationById.get(hoveredPoint.recommendation.occupationId)?.title || hoveredPoint.id}
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[var(--ink-soft)]">Match Score</div>
              <div className="font-semibold">{Math.round(hoveredPoint.size)}/100</div>
            </div>
            <div>
              <div className="text-[var(--ink-soft)]">Accessibility</div>
              <div className="font-semibold">{Math.round(hoveredPoint.x)}/100</div>
            </div>
            <div>
              <div className="text-[var(--ink-soft)]">Reward Potential</div>
              <div className="font-semibold">{Math.round(hoveredPoint.y)}/100</div>
            </div>
            <div>
              <div className="text-[var(--ink-soft)]">Compensation Index</div>
              <div className="font-semibold">
                {occupationById.get(hoveredPoint.recommendation.occupationId)?.valuesProfile.compensation || 0}/100
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-[var(--ink-soft)]">
            {occupationById.get(hoveredPoint.recommendation.occupationId)?.cluster || 'General'}
          </div>
        </motion.div>
      )}

      {/* Interpretation guide */}
      <div className="mt-4 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-4 text-xs">
        <h4 className="mb-2 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
          How to Read This Chart
        </h4>
        <ul className="space-y-1 text-[var(--ink-soft)]">
          <li>
            <strong>Top-right quadrant (★)</strong>: High reward + Easy transition = Ideal targets
          </li>
          <li>
            <strong>Top-left quadrant</strong>: High reward but harder transition = Long-term goals
          </li>
          <li>
            <strong>Bottom-right quadrant</strong>: Lower reward but easy transition = Quick wins
          </li>
          <li>
            <strong>Larger circles</strong>: Higher overall match score based on your profile
          </li>
        </ul>
      </div>
    </div>
  );
}
