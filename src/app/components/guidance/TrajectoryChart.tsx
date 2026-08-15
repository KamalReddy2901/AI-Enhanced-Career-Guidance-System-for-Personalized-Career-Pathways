import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import type { CareerTrajectory, YearOutlook } from '../../services/trajectoryProjector';
import { getTrajectoryDataAge } from '../../services/trajectoryProjector';

interface TrajectoryChartProps {
  trajectory: CareerTrajectory;
}

function TrendIcon({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  if (trend === 'rising') return <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-[var(--accent-news)]" aria-hidden="true" />;
  return <Minus className="h-4 w-4 text-[var(--ink-faint)]" aria-hidden="true" />;
}

function YearCard({ outlook, isBaseline }: { outlook: YearOutlook; isBaseline: boolean }) {
  const demandMid = (outlook.demandRange.min + outlook.demandRange.max) / 2;
  const demandUncertainty = outlook.demandRange.max - outlook.demandRange.min;

  return (
    <div className={`flex-1 ${isBaseline ? 'opacity-80' : ''}`}>
      <div className="card-sketch flex h-full flex-col bg-[var(--paper-raised)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-mono-ui text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
            {outlook.year === 0 ? 'Now' : `+${outlook.year} years`}
          </h4>
          <TrendIcon trend={outlook.salaryTrendIndicator} />
        </div>

        {/* Demand Range */}
        <div className="mb-4">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-display text-2xl text-[var(--ink)]">
              {Math.round(demandMid)}
            </span>
            <span className="text-xs text-[var(--ink-faint)]">±{Math.round(demandUncertainty / 2)}</span>
          </div>
          <div className="mb-2 text-xs text-[var(--ink-soft)]">Demand Index</div>

          {/* Visual range bar */}
          <div className="relative h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className="absolute h-full rounded-full bg-[var(--accent-news)]"
              style={{
                left: `${outlook.demandRange.min}%`,
                width: `${demandUncertainty}%`,
              }}
            />
          </div>
        </div>

        {/* Key Skills */}
        {outlook.keySkills.length > 0 && (
          <div className="mb-3">
            <div className="mb-2 text-xs font-semibold text-[var(--ink)]">
              Key Skills
            </div>
            <div className="space-y-2">
              {outlook.keySkills.slice(0, 2).map((skill, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <TrendIcon trend={skill.trend} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-[var(--ink)]">
                      {skill.skillName}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)] line-clamp-2">
                      {skill.rationale}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emerging Specializations */}
        {outlook.emergingSpecializations.length > 0 && (
          <div className="mt-auto border-t border-black/10 pt-3">
            <div className="mb-2 text-xs font-semibold text-[var(--ink)]">
              Emerging Areas
            </div>
            <div className="flex flex-wrap gap-1">
              {outlook.emergingSpecializations.slice(0, 3).map((spec, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-[var(--accent-news)]/30 bg-[var(--accent-news)]/10 px-2 py-1 text-xs text-[var(--accent-news)]"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TrajectoryChart({ trajectory }: TrajectoryChartProps) {
  const confidenceColors = {
    high: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    medium: 'border-amber-300 bg-amber-50 text-amber-800',
    low: 'border-[var(--accent-news)]/40 bg-[var(--accent-news)]/10 text-[var(--accent-news)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card-sketch bg-[var(--paper-raised)] p-6"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--accent-news)]" aria-hidden="true" />
            <h3 className="font-display text-lg text-[var(--ink)]">
              Career Trajectory Projection
            </h3>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            {trajectory.occupationTitle} · {getTrajectoryDataAge(trajectory.generatedAt)}
          </p>
        </div>
        <div className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${confidenceColors[trajectory.confidenceBand]}`}>
          {trajectory.confidenceBand} confidence
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <YearCard outlook={trajectory.baselineYear} isBaseline={true} />
        <div className="flex items-center justify-center px-2 sm:rotate-0 rotate-90" aria-hidden="true">
          <ArrowRight className="h-5 w-5 text-[var(--ink-faint)]" />
        </div>
        <YearCard outlook={trajectory.year2} isBaseline={false} />
        <div className="flex items-center justify-center px-2 sm:rotate-0 rotate-90" aria-hidden="true">
          <ArrowRight className="h-5 w-5 text-[var(--ink-faint)]" />
        </div>
        <YearCard outlook={trajectory.year3Plus} isBaseline={false} />
      </div>

      {/* Divergence Paths */}
      {trajectory.divergencePaths.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 font-mono-ui text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
            Potential Career Forks
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {trajectory.divergencePaths.map((path, idx) => {
              const likelihoodColors = {
                high: 'bg-emerald-100 text-emerald-700',
                medium: 'bg-amber-100 text-amber-700',
                low: 'bg-black/5 text-[var(--ink-soft)]',
              };

              return (
                <div
                  key={idx}
                  className="border border-black/10 bg-[var(--paper)] p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h5 className="text-sm font-semibold text-[var(--ink)]">
                      {path.title}
                    </h5>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${likelihoodColors[path.likelihood]}`}>
                      {path.likelihood}
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-[var(--ink-soft)]">
                    {path.description}
                  </p>
                  {path.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {path.requiredSkills.map((skill, skillIdx) => (
                        <span
                          key={skillIdx}
                          className="rounded bg-black/5 px-2 py-1 text-xs text-[var(--ink-soft)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assumptions & Disclaimer */}
      <div className="border-l-4 border-amber-400 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h5 className="mb-2 text-sm font-semibold text-amber-900">
              Important Context
            </h5>
            {trajectory.keyAssumptions.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 text-xs font-medium text-amber-800">
                  Key Assumptions:
                </div>
                <ul className="list-inside list-disc space-y-1">
                  {trajectory.keyAssumptions.map((assumption, idx) => (
                    <li key={idx} className="text-xs text-amber-800">
                      {assumption}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs leading-relaxed text-amber-800">
              {trajectory.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
