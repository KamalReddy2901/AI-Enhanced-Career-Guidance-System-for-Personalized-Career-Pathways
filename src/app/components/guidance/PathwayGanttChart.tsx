import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, CheckCircle2, Circle, Target, TrendingUp } from 'lucide-react';
import type { PathwayRoute } from '../../engine/types';
import { occupationById } from '../../data/knowledge';

interface PathwayGanttChartProps {
  route: PathwayRoute;
  className?: string;
}

interface GanttTask {
  id: string;
  name: string;
  description: string;
  startWeek: number;
  endWeek: number;
  duration: number;
  color: string;
  isMilestone: boolean;
  dependencies: string[];
}

const STEP_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
];

export function PathwayGanttChart({ route, className = '' }: PathwayGanttChartProps) {
  const [hoveredTask, setHoveredTask] = useState<GanttTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  const ganttTasks = useMemo<GanttTask[]>(() => {
    let currentWeek = 0;
    const tasks: GanttTask[] = [];

    route.steps.forEach((step, index) => {
      // Use estMonths to calculate duration in weeks
      const durationWeeks = step.estMonths * 4; // Convert months to weeks

      const task: GanttTask = {
        id: `step-${index}`,
        name: step.label,
        description: '', // PathwayStep doesn't have description, leave empty
        startWeek: currentWeek,
        endWeek: currentWeek + durationWeeks,
        duration: durationWeeks,
        color: STEP_COLORS[index % STEP_COLORS.length],
        isMilestone: step.label.toLowerCase().includes('certification') || 
                     step.label.toLowerCase().includes('complete') ||
                     step.label.toLowerCase().includes('launch') ||
                     step.kind === 'qualification' ||
                     step.kind === 'target',
        dependencies: index > 0 ? [`step-${index - 1}`] : [],
      };

      tasks.push(task);
      currentWeek += durationWeeks;
    });

    return tasks;
  }, [route]);

  const totalWeeks = Math.max(...ganttTasks.map(t => t.endWeek), 1);
  const totalMonths = Math.ceil(totalWeeks / 4);

  // Chart dimensions - LARGER for better readability
  const rowHeight = 80;
  const headerHeight = 100;
  const labelWidth = 250;
  const weekWidth = 50;
  const chartWidth = totalWeeks * weekWidth;
  const chartHeight = ganttTasks.length * rowHeight + headerHeight;

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="mb-1 font-display text-xl">{route.label}</h3>
          <div className="flex items-center gap-4 text-xs text-[var(--ink-soft)]">
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{totalMonths} month{totalMonths > 1 ? 's' : ''} total</span>
            </div>
            <div className="flex items-center gap-1">
              <Target size={12} />
              <span>{ganttTasks.length} steps</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>{ganttTasks.filter(t => t.isMilestone).length} milestones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto rounded-sm border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-lg">
        <svg
          width={labelWidth + chartWidth + 40}
          height={chartHeight}
          className="min-w-full"
          role="img"
          aria-label="Pathway timeline Gantt chart"
        >
          {/* Month headers */}
          <g>
            {Array.from({ length: totalMonths + 1 }).map((_, monthIndex) => {
              const x = labelWidth + 20 + monthIndex * 4 * weekWidth;
              return (
                <g key={monthIndex}>
                  {/* Month divider line */}
                  <line
                    x1={x}
                    y1={headerHeight}
                    x2={x}
                    y2={chartHeight}
                    stroke="var(--ink-faint)"
                    strokeWidth="1"
                  />
                  {/* Month label */}
                  <text
                    x={x + 80}
                    y={headerHeight - 50}
                    textAnchor="middle"
                    className="fill-[var(--ink)]"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-mono-ui)', fontWeight: 600 }}
                  >
                    MONTH {monthIndex + 1}
                  </text>
                  {/* Week markers */}
                  {[0, 1, 2, 3].map(weekInMonth => {
                    const weekX = x + weekInMonth * weekWidth;
                    const weekNum = monthIndex * 4 + weekInMonth + 1;
                    if (weekNum > totalWeeks) return null;
                    return (
                      <g key={weekInMonth}>
                        <line
                          x1={weekX}
                          y1={headerHeight - 30}
                          x2={weekX}
                          y2={headerHeight - 20}
                          stroke="var(--ink-soft)"
                          strokeWidth="1"
                        />
                        <text
                          x={weekX}
                          y={headerHeight - 8}
                          textAnchor="middle"
                          className="fill-[var(--ink-soft)]"
                          style={{ fontSize: '9px', fontFamily: 'var(--font-mono-ui)' }}
                        >
                          W{weekNum}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* Task rows */}
          {ganttTasks.map((task, index) => {
            const y = headerHeight + index * rowHeight;
            const barX = labelWidth + 20 + task.startWeek * weekWidth;
            const barWidth = task.duration * weekWidth;
            const isHovered = hoveredTask?.id === task.id;
            const isSelected = selectedTask?.id === task.id;

            return (
              <g key={task.id}>
                {/* Row background (alternating) */}
                <rect
                  x={0}
                  y={y}
                  width={labelWidth + chartWidth + 40}
                  height={rowHeight}
                  fill={index % 2 === 0 ? 'var(--paper)' : 'var(--paper-raised)'}
                />

                {/* Task label */}
                <foreignObject
                  x={10}
                  y={y + 10}
                  width={labelWidth - 20}
                  height={rowHeight - 20}
                >
                  <div className="flex h-full flex-col justify-center">
                    <div className="flex items-center gap-2">
                      {task.isMilestone ? (
                        <CheckCircle2 size={16} className="shrink-0 text-[var(--accent-news)]" />
                      ) : (
                        <Circle size={16} className="shrink-0 text-[var(--ink-soft)]" />
                      )}
                      <span className="font-mono-ui text-sm font-semibold text-[var(--ink)]">
                        {task.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--ink-soft)]">
                      <Clock size={12} />
                      <span>{Math.round(task.duration)} weeks ({(task.duration / 4).toFixed(1)} months)</span>
                    </div>
                  </div>
                </foreignObject>

                {/* Task bar */}
                <motion.g
                  onMouseEnter={() => setHoveredTask(task)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => setSelectedTask(isSelected ? null : task)}
                  style={{ cursor: 'pointer' }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {/* Bar shadow on hover */}
                  {(isHovered || isSelected) && (
                    <rect
                      x={barX - 2}
                      y={y + 12}
                      width={barWidth + 4}
                      height={rowHeight - 24 + 4}
                      fill="none"
                      stroke={task.color}
                      strokeWidth="2"
                      rx="6"
                      opacity="0.3"
                    />
                  )}

                  {/* Main bar */}
                  <rect
                    x={barX}
                    y={y + 15}
                    width={barWidth}
                    height={rowHeight - 30}
                    fill={task.color}
                    opacity={isHovered || isSelected ? 0.9 : 0.7}
                    rx="4"
                  />

                  {/* Progress gradient overlay */}
                  <defs>
                    <linearGradient id={`gradient-${task.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={barX}
                    y={y + 15}
                    width={barWidth}
                    height={rowHeight - 30}
                    fill={`url(#gradient-${task.id})`}
                    rx="4"
                  />

                  {/* Duration label on bar - LARGER */}
                  <text
                    x={barX + barWidth / 2}
                    y={y + rowHeight / 2 + 5}
                    textAnchor="middle"
                    className="fill-white"
                    style={{ fontSize: '13px', fontFamily: 'var(--font-mono-ui)', fontWeight: 700 }}
                  >
                    {Math.round(task.duration)}w
                  </text>

                  {/* Milestone diamond */}
                  {task.isMilestone && (
                    <g>
                      <rect
                        x={barX + barWidth - 8}
                        y={y + 10}
                        width={12}
                        height={12}
                        fill="var(--accent-news)"
                        transform={`rotate(45 ${barX + barWidth - 2} ${y + 16})`}
                      />
                      <circle
                        cx={barX + barWidth - 2}
                        cy={y + 16}
                        r="2"
                        fill="white"
                      />
                    </g>
                  )}
                </motion.g>

                {/* Dependency arrow */}
                {task.dependencies.length > 0 && index > 0 && (
                  <g opacity="0.3">
                    <line
                      x1={barX}
                      y1={y + rowHeight / 2}
                      x2={barX - 10}
                      y2={y + rowHeight / 2}
                      stroke="var(--ink)"
                      strokeWidth="1"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="var(--ink)" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Selected task detail panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 rounded-sm border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-4"
            style={{ borderColor: selectedTask.color }}
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                {selectedTask.isMilestone ? (
                  <CheckCircle2 size={18} style={{ color: selectedTask.color }} />
                ) : (
                  <Circle size={18} style={{ color: selectedTask.color }} />
                )}
                <h4 className="font-semibold">{selectedTask.name}</h4>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                Close
              </button>
            </div>

            {selectedTask.description && (
              <p className="mb-3 text-sm text-[var(--ink-soft)]">
                {selectedTask.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="mb-1 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
                  Duration
                </div>
                <div className="font-semibold">
                  {Math.round(selectedTask.duration)} weeks
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
                  Timeline
                </div>
                <div className="font-semibold">
                  Week {selectedTask.startWeek + 1} - {selectedTask.endWeek}
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
                  Type
                </div>
                <div className="font-semibold">
                  {selectedTask.isMilestone ? 'Milestone ⭐' : 'Regular Step'}
                </div>
              </div>
            </div>

            {selectedTask.dependencies.length > 0 && (
              <div className="mt-3 text-xs">
                <div className="mb-1 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
                  Dependencies
                </div>
                <div className="text-[var(--ink-soft)]">
                  Starts after completing previous step
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-4 rounded-sm border border-[var(--ink-faint)] bg-[var(--paper)] p-4 text-xs">
        <h4 className="mb-2 font-mono-ui text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">
          Timeline Guide
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-8 rounded-sm bg-[#3b82f6]" style={{ opacity: 0.7 }} />
            <span className="text-[var(--ink-soft)]">Regular step</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--accent-news)]" />
            <span className="text-[var(--ink-soft)]">Milestone checkpoint</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--ink-soft)]" />
            <span className="text-[var(--ink-soft)]">Click bars for details</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--ink-soft)]" />
            <span className="text-[var(--ink-soft)]">Sequential dependencies</span>
          </div>
        </div>
      </div>
    </div>
  );
}
