import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  x: number;
  y: number;
  size: number;
  color: string;
  recommendation: CareerRecommendation;
}

interface TooltipState {
  point: ScatterPoint;
  mouseX: number;
  mouseY: number;
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
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const c = lang === 'hi'
    ? { title:'करियर परिदृश्य', instructions:'इस दृश्य का उपयोग कैसे करें', hover:'किसी वृत्त पर होवर करके विवरण देखें', click:'विवरण देखने के लिए क्लिक करें', size:'बड़े वृत्त = बेहतर समग्र मेल स्कोर', sweet:'ऊपरी-दायाँ भाग = अधिक लाभ + आसान बदलाव', match:'मेल स्कोर', access:'बदलाव की सुगमता', reward:'लाभ की संभावना', compensation:'प्रतिफल', cluster:'समूह', empty:'विवरण देखने के लिए किसी वृत्त पर होवर करें', read:'इस चार्ट को कैसे पढ़ें', highEasy:'अधिक लाभ + आसान बदलाव = आदर्श लक्ष्य', highHard:'अधिक लाभ, कठिन बदलाव = दीर्घकालिक लक्ष्य', lowEasy:'कम लाभ, आसान बदलाव = त्वरित अवसर', larger:'बड़े वृत्त = अधिक समग्र मेल', point:'विवरण खोलें', yAxis:'लाभ की संभावना (अधिक = बेहतर) →', xAxis:'बदलाव की सुगमता (अधिक = आसान) →', highReward:'अधिक लाभ', challenging:'चुनौतीपूर्ण', sweetSpot:'★ सर्वोत्तम ★', sweetSub:'अधिक लाभ + आसान', lowerReward:'कम लाभ', quickWins:'त्वरित अवसर', clickToOpen:'क्लिक करके खोलें' }
    : lang === 'te'
      ? { title:'కెరీర్ దృశ్యం', instructions:'ఈ దృశ్యాన్ని ఎలా ఉపయోగించాలి', hover:'వివరాలు చూడటానికి వృత్తంపై హోవర్ చేయండి', click:'వివరాలు చూడటానికి క్లిక్ చేయండి', size:'పెద్ద వృత్తాలు = మెరుగైన సరిపోలిక', sweet:'ఎగువ కుడి = అధిక ప్రతిఫలం + సులభ మార్పు', match:'సరిపోలిక', access:'మార్పు సౌలభ్యం', reward:'ప్రతిఫల అవకాశం', compensation:'ప్రతిఫలం', cluster:'సమూహం', empty:'వివరాలు చూడటానికి వృత్తంపై హోవర్ చేయండి', read:'ఈ చార్ట్‌ను ఎలా చదవాలి', highEasy:'అధిక ప్రతిఫలం + సులభ మార్పు', highHard:'అధిక ప్రతిఫలం, కఠిన మార్పు', lowEasy:'తక్కువ ప్రతిఫలం, సులభ మార్పు', larger:'పెద్ద వృత్తాలు = అధిక సరిపోలిక', point:'వివరాలు తెరవండి', yAxis:'ప్రతిఫల అవకాశం (ఎక్కువ = మెరుగు) →', xAxis:'మార్పు సౌలభ్యం (ఎక్కువ = సులభం) →', highReward:'అధిక ప్రతిఫలం', challenging:'సవాలైన', sweetSpot:'★ అనుకూల ★', sweetSub:'అధిక ప్రతిఫలం + సులభ', lowerReward:'తక్కువ ప్రతిఫలం', quickWins:'త్వరిత అవకాశాలు', clickToOpen:'క్లిక్ చేసి తెరవండి' }
      : { title:'Career landscape', instructions:'How to use this visualization', hover:'Hover over any circle to see career details', click:'Click to open full career details', size:'Larger circles = better overall match score', sweet:'Top-right = high reward + easier transition', match:'Match score', access:'Ease of transition', reward:'Reward potential', compensation:'Compensation', cluster:'Cluster', empty:'Hover over any circle to see career details', read:'How to read this chart', highEasy:'High reward + easy transition = ideal targets', highHard:'High reward but harder transition = long-term goals', lowEasy:'Lower reward but easy transition = quick wins', larger:'Larger circles = higher overall match score', point:'Open details for', yAxis:'REWARD POTENTIAL (Higher = Better) →', xAxis:'EASE OF TRANSITION (Higher = Easier) →', highReward:'HIGH REWARD', challenging:'CHALLENGING', sweetSpot:'★ SWEET SPOT ★', sweetSub:'High Reward + Easy Access', lowerReward:'Lower Reward', quickWins:'QUICK WINS', clickToOpen:'Click to open' };

  const scatterPoints = useMemo<ScatterPoint[]>(() => {
    return recommendations.map(rec => {
      const occupation = occupationById.get(rec.occupationId);
      if (!occupation) return null;

      const skillGapComponent = rec.components.find(c => c.dimension === 'skill');
      const accessibility = 100 - (skillGapComponent?.score || 50);
      const compensationScore = occupation.valuesProfile.compensation || 50;
      const marketComponent = rec.components.find(c => c.dimension === 'market');
      const growthScore = marketComponent?.score || 50;
      const rewardPotential = (compensationScore * 0.6) + (growthScore * 0.4);
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

  const width = 1000;
  const height = 700;
  const padding = { top: 60, right: 60, bottom: 80, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const midX = padding.left + chartWidth / 2;
  const midY = padding.top + chartHeight / 2;

  // Handle mouse move over SVG to position tooltip
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!tooltip) return;
    setTooltip(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
  }, [tooltip]);

  // Clamp tooltip position to viewport
  const getTooltipPosition = useCallback((mouseX: number, mouseY: number) => {
    const tooltipWidth = 260;
    const tooltipHeight = 200;
    const offset = 15;
    
    let left = mouseX + offset;
    let top = mouseY - tooltipHeight / 2;
    
    // Check right boundary
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = mouseX - tooltipWidth - offset;
    }
    // Check bottom boundary
    if (top + tooltipHeight > window.innerHeight - 10) {
      top = window.innerHeight - tooltipHeight - 10;
    }
    // Check top boundary
    if (top < 10) top = 10;
    
    return { left, top };
  }, []);

  return (
    <section className={`relative ${className}`} aria-label={c.title}>
      {/* Instructions banner */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-[var(--ink-soft)]">
        <span>• {c.hover}</span>
        <span>• {c.click}</span>
        <span>• {c.size}</span>
        <span>• {c.sweet}</span>
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="mx-auto max-w-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-lg"
        role="group"
        aria-label={c.title}
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={() => setTooltip(null)}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Y-axis label */}
        <text
          x={22}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 22 ${height / 2})`}
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600, fill: 'var(--ink)', letterSpacing: '0.08em' }}
        >
          {c.yAxis}
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 18}
          textAnchor="middle"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600, fill: 'var(--ink)', letterSpacing: '0.08em' }}
        >
          {c.xAxis}
        </text>

        {/* Grid lines */}
        {[25, 50, 75].map(value => {
          const x = padding.left + (value / 100) * chartWidth;
          const y = padding.top + chartHeight - (value / 100) * chartHeight;
          return (
            <g key={value}>
              <line x1={x} y1={padding.top} x2={x} y2={padding.top + chartHeight} stroke="var(--ink)" strokeWidth="0.5" opacity="0.15" />
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="var(--ink)" strokeWidth="0.5" opacity="0.15" />
            </g>
          );
        })}

        {/* Quadrant dividers */}
        <line x1={midX} y1={padding.top} x2={midX} y2={padding.top + chartHeight} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.25" />
        <line x1={padding.left} y1={midY} x2={padding.left + chartWidth} y2={midY} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.25" />

        {/* Quadrant labels */}
        <g style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ui)', letterSpacing: '0.08em', fontWeight: 600 }}>
          {/* Top-left: High Reward Challenging */}
          <text x={padding.left + chartWidth * 0.25} y={padding.top + chartHeight * 0.12} textAnchor="middle" style={{ fill: 'var(--ink)', opacity: 0.5 }}>{c.highReward}</text>
          <text x={padding.left + chartWidth * 0.25} y={padding.top + chartHeight * 0.12 + 15} textAnchor="middle" style={{ fill: 'var(--ink)', opacity: 0.5 }}>{c.challenging}</text>

          {/* Top-right: Sweet Spot */}
          <text x={padding.left + chartWidth * 0.75} y={padding.top + chartHeight * 0.12} textAnchor="middle" style={{ fill: 'var(--accent-news)', opacity: 0.9, fontSize: '13px', fontWeight: 700 }}>{c.sweetSpot}</text>
          <text x={padding.left + chartWidth * 0.75} y={padding.top + chartHeight * 0.12 + 16} textAnchor="middle" style={{ fill: 'var(--accent-news)', opacity: 0.7 }}>{c.sweetSub}</text>

          {/* Bottom-left */}
          <text x={padding.left + chartWidth * 0.25} y={padding.top + chartHeight * 0.88} textAnchor="middle" style={{ fill: 'var(--ink-soft)', opacity: 0.4 }}>{c.lowerReward}</text>
          <text x={padding.left + chartWidth * 0.25} y={padding.top + chartHeight * 0.88 + 15} textAnchor="middle" style={{ fill: 'var(--ink-soft)', opacity: 0.4 }}>{c.challenging}</text>

          {/* Bottom-right: Quick Wins */}
          <text x={padding.left + chartWidth * 0.75} y={padding.top + chartHeight * 0.88} textAnchor="middle" style={{ fill: 'var(--ink)', opacity: 0.5 }}>{c.quickWins}</text>
          <text x={padding.left + chartWidth * 0.75} y={padding.top + chartHeight * 0.88 + 15} textAnchor="middle" style={{ fill: 'var(--ink)', opacity: 0.5 }}>{c.lowEasy}</text>
        </g>

        {/* Scatter points */}
        {scatterPoints.map(point => {
          const cx = padding.left + (point.x / 100) * chartWidth;
          const cy = padding.top + chartHeight - (point.y / 100) * chartHeight;
          const radius = 8 + (point.size / 100) * 18;
          const isHighlighted = point.id === highlightedId;
          const isHovered = tooltip?.point.id === point.id;

          return (
            <g
              key={point.id}
              role="button"
              tabIndex={0}
              aria-label={`${occupationName(point.id, occupationById.get(point.id)?.title ?? point.id, lang)} — ${c.match} ${Math.round(point.size)}/100`}
              onMouseEnter={(e) => setTooltip({ point, mouseX: e.clientX, mouseY: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip({ point, mouseX: 0, mouseY: 0 })}
              onBlur={() => setTooltip(null)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCareerClick?.(point.recommendation); } }}
              onClick={() => onCareerClick?.(point.recommendation)}
              style={{ cursor: 'pointer' }}
            >
              {/* Pulse ring for highlighted */}
              {isHighlighted && (
                <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke={point.color} strokeWidth="2" opacity="0.4" />
              )}
              {/* Hover ring */}
              {isHovered && (
                <circle cx={cx} cy={cy} r={radius + 5} fill={point.color} opacity="0.2" />
              )}
              {/* Main dot */}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={point.color}
                opacity={isHovered || isHighlighted ? 1 : 0.75}
                stroke="white"
                strokeWidth={isHovered ? 2.5 : 1.5}
              />
              {/* Label on hover - inside SVG near dot */}
              {isHovered && (
                <text
                  x={cx}
                  y={cy - radius - 8}
                  textAnchor="middle"
                  style={{ fontSize: '11px', fontFamily: 'var(--font-mono-ui)', fontWeight: 700, fill: 'var(--ink)' }}
                  className="pointer-events-none"
                >
                  {occupationName(point.id, occupationById.get(point.id)?.title ?? point.id, lang).substring(0, 22)}
                  {occupationName(point.id, occupationById.get(point.id)?.title ?? point.id, lang).length > 22 ? '…' : ''}
                </text>
              )}
            </g>
          );
        })}

        {/* Chart border */}
        <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="none" stroke="var(--ink)" strokeWidth="2" />
      </svg>

      {/* Floating cursor tooltip — rendered in a portal-like fixed div */}
      <AnimatePresence>
        {tooltip && tooltip.mouseX > 0 && (
          <motion.div
            ref={tooltipRef}
            key="tooltip"
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed z-[9999] w-[260px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-4 shadow-[4px_4px_0_var(--ink)]"
            style={getTooltipPosition(tooltip.mouseX, tooltip.mouseY)}
          >
            <div className="mb-2 border-b border-[var(--ink-faint)] pb-2">
              <div className="font-display text-base leading-tight">
                {occupationName(tooltip.point.id, occupationById.get(tooltip.point.recommendation.occupationId)?.title ?? tooltip.point.id, lang)}
              </div>
              <div className="mt-0.5 font-mono-ui text-[9px] uppercase tracking-widest text-[var(--ink-soft)]">
                {(occupationById.get(tooltip.point.recommendation.occupationId)?.cluster || 'general').replace('_', ' ')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <div className="font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">{c.match}</div>
                <div className="font-display text-xl font-bold">{Math.round(tooltip.point.size)}<span className="font-mono-ui text-[10px] text-[var(--ink-soft)]">/100</span></div>
              </div>
              <div>
                <div className="font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">{c.access}</div>
                <div className="font-display text-xl font-bold">{Math.round(tooltip.point.x)}<span className="font-mono-ui text-[10px] text-[var(--ink-soft)]">/100</span></div>
              </div>
              <div>
                <div className="font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">{c.reward}</div>
                <div className="font-display text-xl font-bold">{Math.round(tooltip.point.y)}<span className="font-mono-ui text-[10px] text-[var(--ink-soft)]">/100</span></div>
              </div>
              <div>
                <div className="font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">{c.compensation}</div>
                <div className="font-display text-xl font-bold">
                  {occupationById.get(tooltip.point.recommendation.occupationId)?.valuesProfile.compensation || 0}
                  <span className="font-mono-ui text-[10px] text-[var(--ink-soft)]">/100</span>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--ink-faint)] font-mono-ui text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">
              {c.clickToOpen} →
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static info below graph — only shows after click/focus when no cursor */}
      <div className="mt-4 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-3 text-center text-sm text-[var(--ink-soft)]">
        {c.empty}
      </div>
    </section>
  );
}
