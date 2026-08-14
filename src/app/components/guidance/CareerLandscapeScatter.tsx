import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react';
import type { CareerRecommendation } from '../../engine/types';
import { occupationById } from '../../data/knowledge';
import { useT } from '../../i18n';
import { occupationName } from '../../i18n/occupationNames';

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
  const { lang } = useT();
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);
  const c = lang === 'hi'
    ? {title:'करियर परिदृश्य', instructions:'इस दृश्य का उपयोग कैसे करें', hover:'किसी वृत्त पर होवर या फ़ोकस करके विवरण देखें', click:'विवरण देखने के लिए क्लिक या Enter दबाएँ', size:'बड़े वृत्त = बेहतर समग्र मेल स्कोर', sweet:'ऊपरी-दायाँ भाग = अधिक लाभ + आसान बदलाव', match:'मेल स्कोर', access:'बदलाव की सुगमता', reward:'लाभ की संभावना', compensation:'प्रतिफल', cluster:'समूह', empty:'विवरण देखने के लिए किसी वृत्त पर होवर या फ़ोकस करें', read:'इस चार्ट को कैसे पढ़ें', highEasy:'अधिक लाभ + आसान बदलाव = आदर्श लक्ष्य', highHard:'अधिक लाभ, कठिन बदलाव = दीर्घकालिक लक्ष्य', lowEasy:'कम लाभ, आसान बदलाव = त्वरित अवसर', larger:'बड़े वृत्त = आपकी प्रोफ़ाइल के आधार पर अधिक समग्र मेल', point:'विवरण खोलें', yAxis:'लाभ की संभावना (अधिक = बेहतर)', xAxis:'बदलाव की सुगमता (अधिक = आसान)', highReward:'अधिक लाभ', challenging:'चुनौतीपूर्ण मार्ग', sweetSpot:'बेहतरीन अवसर', sweetSub:'अधिक लाभ + आसान बदलाव', lowerReward:'कम लाभ', quickWins:'त्वरित अवसर'}
    : lang === 'te'
      ? {title:'కెరీర్ దృశ్యం', instructions:'ఈ దృశ్యాన్ని ఎలా ఉపయోగించాలి', hover:'వివరాలు చూడటానికి వృత్తంపై హోవర్ చేయండి లేదా ఫోకస్ చేయండి', click:'వివరాలు చూడటానికి క్లిక్ చేయండి లేదా Enter నొక్కండి', size:'పెద్ద వృత్తాలు = మెరుగైన మొత్తం సరిపోలిక స్కోరు', sweet:'ఎగువ కుడి భాగం = అధిక ప్రతిఫలం + సులభ మార్పు', match:'సరిపోలిక స్కోరు', access:'మార్పు సౌలభ్యం', reward:'ప్రతిఫల అవకాశం', compensation:'ప్రతిఫలం', cluster:'సమూహం', empty:'వివరాలు చూడటానికి వృత్తంపై హోవర్ చేయండి లేదా ఫోకస్ చేయండి', read:'ఈ చార్ట్‌ను ఎలా చదవాలి', highEasy:'అధిక ప్రతిఫలం + సులభ మార్పు = అనుకూల లక్ష్యాలు', highHard:'అధిక ప్రతిఫలం, కఠిన మార్పు = దీర్ఘకాలిక లక్ష్యాలు', lowEasy:'తక్కువ ప్రతిఫలం, సులభ మార్పు = త్వరిత అవకాశాలు', larger:'పెద్ద వృత్తాలు = మీ ప్రొఫైల్ ఆధారంగా అధిక మొత్తం సరిపోలిక', point:'వివరాలు తెరవండి', yAxis:'ప్రతిఫల అవకాశం (ఎక్కువ = మెరుగైనది)', xAxis:'మార్పు సౌలభ్యం (ఎక్కువ = సులభం)', highReward:'అధిక ప్రతిఫలం', challenging:'సవాలైన మార్గం', sweetSpot:'అనుకూల అవకాశం', sweetSub:'అధిక ప్రతిఫలం + సులభ మార్పు', lowerReward:'తక్కువ ప్రతిఫలం', quickWins:'త్వరిత అవకాశాలు'}
      : {title:'Career landscape', instructions:'How to use this visualization', hover:'Hover over or focus any circle to see career details', click:'Click or press Enter to view the full career details', size:'Larger circles = better overall match score', sweet:'Top-right = high reward + easier transition', match:'Match score', access:'Ease of transition', reward:'Reward potential', compensation:'Compensation', cluster:'Cluster', empty:'Hover over or focus any circle to see career details', read:'How to read this chart', highEasy:'High reward + easy transition = ideal targets', highHard:'High reward but harder transition = long-term goals', lowEasy:'Lower reward but easy transition = quick wins', larger:'Larger circles = higher overall match score based on your profile', point:'Open details for', yAxis:'REWARD POTENTIAL (Higher = Better)', xAxis:'EASE OF TRANSITION (Higher = Easier)', highReward:'HIGH REWARD', challenging:'CHALLENGING PATH', sweetSpot:'★ SWEET SPOT ★', sweetSub:'High Reward + Easy Access', lowerReward:'Lower Reward', quickWins:'QUICK WINS'};

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
    <section className={`relative ${className}`} aria-label={c.title}>
      {/* Instructions */}
      <div className="mb-4 rounded-sm border-2 border-[var(--accent-news)] bg-[var(--paper)] p-4">
        <h4 className="mb-2 font-mono-ui text-sm font-semibold uppercase tracking-wide">
          {c.instructions}
        </h4>
        <ul className="space-y-1 text-sm text-[var(--ink-soft)]">
          <li>• {c.hover}</li>
          <li>• {c.click}</li>
          <li>• {c.size}</li>
          <li>• {c.sweet}</li>
        </ul>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[var(--ink-soft)]" />
          <span className="text-[var(--ink-soft)]">{c.size}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[var(--ink-soft)]" />
          <span className="text-[var(--ink-soft)]">{c.cluster}</span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width={width}
        height={height}
        className="mx-auto border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-lg"
        role="group"
        aria-label={c.title}
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
          {c.yAxis} →
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          className="fill-[var(--ink)]"
          style={{ fontSize: '13px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600 }}
        >
          {c.xAxis} →
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
            {c.highReward}
          </text>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.2 + 16}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            {c.challenging}
          </text>

          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.2}
            textAnchor="middle"
            className="fill-[var(--accent-news)]"
            opacity="0.8"
            style={{ fontSize: '14px', fontWeight: 700 }}
          >
            {c.sweetSpot}
          </text>
          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.2 + 16}
            textAnchor="middle"
            className="fill-[var(--accent-news)]"
            opacity="0.8"
          >
            {c.sweetSub}
          </text>

          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.8}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            {c.lowerReward}
          </text>
          <text
            x={padding.left + chartWidth * 0.25}
            y={padding.top + chartHeight * 0.8 + 16}
            textAnchor="middle"
            className="fill-[var(--ink-soft)]"
            opacity="0.5"
          >
            {c.challenging}
          </text>

          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.8}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            {c.quickWins}
          </text>
          <text
            x={padding.left + chartWidth * 0.75}
            y={padding.top + chartHeight * 0.8 + 16}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            opacity="0.6"
          >
            {c.lowEasy}
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
              className="career-landscape-point"
              role="button"
              tabIndex={0}
              aria-label={`${c.point}: ${occupationName(point.id, occupationById.get(point.id)?.title ?? point.id, lang)}. ${c.match} ${Math.round(point.size)}. ${c.access} ${Math.round(point.x)}. ${c.reward} ${Math.round(point.y)}.`}
              onMouseOver={() => setHoveredPoint(point)}
              onMouseOut={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint(point)}
              onBlur={() => setHoveredPoint(null)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onCareerClick?.(point.recommendation); } }}
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
            {occupationName(hoveredPoint.id, occupationById.get(hoveredPoint.recommendation.occupationId)?.title ?? hoveredPoint.id, lang)}
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">{c.match}</span>
              <span className="font-display text-lg font-bold">{Math.round(hoveredPoint.size)}<span className="text-xs text-[var(--ink-soft)]">/100</span></span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">{c.access}</span>
              <span className="font-display text-lg font-bold">{Math.round(hoveredPoint.x)}<span className="text-xs text-[var(--ink-soft)]">/100</span></span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">{c.reward}</span>
              <span className="font-display text-lg font-bold">{Math.round(hoveredPoint.y)}<span className="text-xs text-[var(--ink-soft)]">/100</span></span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ink-faint)] pb-2">
              <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)] tracking-wide">{c.compensation}</span>
              <span className="font-display text-lg font-bold">
                {occupationById.get(hoveredPoint.recommendation.occupationId)?.valuesProfile.compensation || 0}<span className="text-xs text-[var(--ink-soft)]">/100</span>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t-2 border-[var(--ink-faint)]">
            <span className="font-mono-ui text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">{c.cluster}: </span>
            <span className="font-semibold text-sm capitalize">
              {(occupationById.get(hoveredPoint.recommendation.occupationId)?.cluster || 'general').replace('_', ' ')}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded border border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-center text-sm text-[var(--ink-soft)]">
          {c.empty}
        </div>
      )}

      {/* Interpretation guide */}
      <div className="mt-4 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-4 text-xs">
        <h4 className="mb-2 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
          {c.read}
        </h4>
        <ul className="space-y-1 text-[var(--ink-soft)]">
          <li>
            <strong>↗</strong>: {c.highEasy}
          </li>
          <li>
            <strong>↖</strong>: {c.highHard}
          </li>
          <li>
            <strong>↘</strong>: {c.lowEasy}
          </li>
          <li>
            <strong>●</strong>: {c.larger}
          </li>
        </ul>
      </div>
    </section>
  );
}
