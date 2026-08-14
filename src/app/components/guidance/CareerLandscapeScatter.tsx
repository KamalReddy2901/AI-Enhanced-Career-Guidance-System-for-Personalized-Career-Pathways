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

  // SVG dimensions - MUCH LARGER for better interaction
  const width = 1000;
  const height = 700;
  const padding = { top: 60, right: 60, bottom: 80, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Quadrant lines at 50,50
  const midX = padding.left + chartWidth / 2;
  const midY = padding.top + chartHeight / 2;

  return (
    <div className={`relative ${className}`}>
      {/* Instructions */}
      <div className="mb-4 rounded-sm border-2 border-[var(--accent-news)] bg-[var(--paper)] p-4">
        <h4 className="mb-2 font-mono-ui text-sm font-semibold uppercase tracking-wide">
          📊 How to Use This Visualization
        </h4>
        <ul className="space-y-1 text-sm text-[var(--ink-soft)]">
          <li>• <strong>Hover</strong> over any circle to see detailed career information</li>
          <li>• <strong>Click</strong> a circle to view full career details</li>
          <li>• <strong>Larger circles</strong> = Better overall match score</li>
          <li>• <strong>Look for the ★ SWEET SPOT ★</strong> quadrant (top-right) = High reward + Easy transition</li>
        </ul>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[var(--ink-soft)]" />
          <span className="text-[var(--ink-soft)]">Size = Match Score</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[var(--ink-soft)]" />
          <span className="text-[var(--ink-soft)]">Color = Career Cluster</span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width={width}
        height={height}
        className="mx-auto border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-lg"
        role="img"
        aria-label="Career landscape scatter plot"
      >
        {/* Y-axis label */}
        <text
          x={30}
          y={height / 2}
          textAnchor="middle"
          className="fill-[var(--ink)]"
          style={{ fontSize: '13px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600 }}
          transform={`rotate(-90 30 ${height / 2})`}
        >
          REWARD POTENTIAL (Higher = Better) →
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          className="fill-[var(--ink)]"
          style={{ fontSize: '13px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600 }}
        >
          ACCESSIBILITY / EASE OF TRANSITION (Higher = Easier) →
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

        {/* Quadrant labels - LARGER and more visible */}
        <g style={{ fontSize: '12px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600 }}>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.2}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            HIGH REWARD
          </text>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.2 + 16}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            CHALLENGING PATH
          </text>

          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.2}
            textAnchor="middle"
            className="fill-[var(--accent-news)]"
            opacity="0.8"
            style={{ fontSize: '14px', fontWeight: 700 }}
          >
            ★ SWEET SPOT ★
          </text>
          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.2 + 16}
            textAnchor="middle"
            className="fill-[var(--accent-news)]"
            opacity="0.8"
          >
            High Reward + Easy Access
          </text>

          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.8}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Lower Reward
          </text>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.8 + 16}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            Challenging Path
          </text>

          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.8}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            QUICK WINS
          </text>
          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.8 + 16}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            Lower Reward + Easy Access
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
          const radius = 8 + (point.size / 100) * 20; // 8-28px radius - LARGER for better visibility
          const isHighlighted = point.id === highlightedId;
          const isHovered = hoveredPoint?.id === point.id;

          return (
            <g 
              key={point.id}
              onMouseOver={() => setHoveredPoint(point)}
              onMouseOut={() => setHoveredPoint(null)}
              onClick={() => onCareerClick?.(point.recommendation)}
              style={{ cursor: 'pointer' }}
              pointerEvents="all"
            >
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
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={point.color}
                opacity={isHighlighted || isHovered ? 1 : 0.7}
                stroke="var(--ink)"
                strokeWidth={isHovered ? "2" : "1"}
              />
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

      {/* Hover tooltip - NO ANIMATION DELAY */}
      {hoveredPoint ? (
        <div className="mt-4 rounded border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-4 shadow-md">
          <h4 className="mb-3 font-display text-xl leading-tight border-b-2 border-[var(--ink-faint)] pb-2">
            {occupationById.get(hoveredPoint.recommendation.occupationId)?.title || hoveredPoint.id}
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">Match Score</span>
              <span className="font-display text-lg font-bold">{Math.round(hoveredPoint.size)}<span className="text-xs text-[var(--ink-soft)]">/100</span></span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">Accessibility</span>
              <span className="font-display text-lg font-bold">{Math.round(hoveredPoint.x)}<span className="text-xs text-[var(--ink-soft)]">/100</span></span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">Reward</span>
              <span className="font-display text-lg font-bold">{Math.round(hoveredPoint.y)}<span className="text-xs text-[var(--ink-soft)]">/100</span></span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">Compensation</span>
              <span className="font-display text-lg font-bold">
                {occupationById.get(hoveredPoint.recommendation.occupationId)?.valuesProfile.compensation || 0}<span className="text-xs text-[var(--ink-soft)]">/100</span>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t-2 border-[var(--ink-faint)]">
            <span className="font-mono-ui text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">Cluster: </span>
            <span className="font-semibold text-sm capitalize">
              {(occupationById.get(hoveredPoint.recommendation.occupationId)?.cluster || 'general').replace('_', ' ')}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded border border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-center text-sm text-[var(--ink-soft)]">
          Hover over any circle to see career details
        </div>
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
