import { ExternalLink, GraduationCap, Clock } from 'lucide-react';
import { useT } from '../../i18n';
import type { CareerPassport } from '../../engine/types';
import { computeGapReport, learningRoutesForSkill, skillName } from '../../engine/gaps';
import { sounds } from '../../utils/sounds';
import { hapticTap } from '../../utils/haptic';

export function GapLearningRoutes({ passport, occupationId }: { passport: CareerPassport; occupationId: string }) {
  const { lang } = useT();
  const c = lang === 'hi' 
    ? { title: 'यह अंतर इनसे पाटें', months: 'महीने', via: 'के माध्यम से' } 
    : lang === 'te' 
      ? { title: 'ఈ లోటును వీటితో పూరించండి', months: 'నెలలు', via: 'ద్వారా' } 
      : { title: 'Close this gap via', months: 'months', via: 'via' };
  
  const gaps = computeGapReport(passport, occupationId).gaps.slice(0, 3);
  if (!gaps.length) return null;
  
  return (
    <section className="my-8 border-2 border-[var(--ink)] bg-gradient-to-br from-white to-gray-50 p-6 shadow-[4px_4px_0_var(--ink)]">
      {/* Header with red accent */}
      <div className="mb-6 flex items-center gap-3 border-l-4 border-[var(--accent-news)] pl-4">
        <GraduationCap size={28} className="text-[var(--accent-news)]" />
        <h2 className="font-display text-3xl">{c.title}</h2>
      </div>
      
      {/* Skills grid */}
      <div className="space-y-6">
        {gaps.map(gap => (
          <div 
            key={gap.skillId} 
            className="card-sketch bg-white p-5 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[4px_4px_0_var(--ink)]"
          >
            {/* Skill name badge */}
            <div className="mb-4 inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--accent-news)] px-4 py-2">
              <span className="font-mono-ui text-sm font-bold uppercase tracking-wide text-white">
                {skillName(gap.skillId)}
              </span>
            </div>
            
            {/* Learning routes */}
            <div className="space-y-4">
              {learningRoutesForSkill(gap.skillId).map(route => (
                <div key={route.id} className="border-l-2 border-gray-300 pl-4">
                  {/* Route metadata */}
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="font-[Inter] text-sm font-semibold text-[var(--ink)]">
                      {route.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 font-mono-ui text-[10px] uppercase text-blue-800">
                      <Clock size={12} />
                      {route.typicalMonths} {c.months}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 font-mono-ui text-[10px] uppercase text-emerald-800">
                      NSQF {route.nsqfLevel}
                    </span>
                  </div>
                  
                  {/* Action links as cards */}
                  <div className="flex flex-wrap gap-2">
                    {route.links?.map(link => (
                      <a 
                        key={link.url} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        data-testid={`gap-learning-link-${route.id}-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        onClick={() => { sounds.click(); hapticTap(); }}
                        className="group inline-flex min-h-11 items-center gap-2 border-2 border-[var(--ink)] bg-white px-4 py-2 font-mono-ui text-xs uppercase tracking-wide transition-[transform,box-shadow] hover:-translate-y-[2px] hover:bg-[var(--ink)] hover:text-[var(--paper)] hover:shadow-[3px_3px_0_var(--ink)]"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-[2px]" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
