import { ExternalLink } from 'lucide-react';
import { useT } from '../../i18n';
import type { CareerPassport } from '../../engine/types';
import { computeGapReport, learningRoutesForSkill, skillName } from '../../engine/gaps';
import { sounds } from '../../utils/sounds';
import { hapticTap } from '../../utils/haptic';

export function GapLearningRoutes({ passport, occupationId }: { passport: CareerPassport; occupationId: string }) {
  const { lang } = useT(); const c=lang==='hi'?{title:'यह अंतर इनसे पाटें',months:'महीने'}:lang==='te'?{title:'ఈ లోటును వీటితో పూరించండి',months:'నెలలు'}:{title:'Close this gap via',months:'months'};
  const gaps=computeGapReport(passport,occupationId).gaps.slice(0,3);
  if(!gaps.length)return null;
  return <section className="my-8 border border-black/10 bg-white p-5"><h2 className="font-display text-2xl">{c.title}</h2>{gaps.map(gap=><div key={gap.skillId} className="rule-top mt-4 pt-4"><p className="font-[Inter] text-sm font-semibold">{skillName(gap.skillId)}</p>{learningRoutesForSkill(gap.skillId).map(route=><div key={route.id} className="mt-3"><p className="font-[Inter] text-xs text-[var(--ink-soft)]">{route.name} · {route.typicalMonths} {c.months} · NSQF {route.nsqfLevel}</p><div className="mt-2 flex flex-wrap gap-2">{route.links?.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" data-testid={`gap-learning-link-${route.id}-${link.label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`} onClick={()=>{sounds.click();hapticTap();}} className="inline-flex min-h-11 items-center gap-1 border border-[var(--ink)] px-3 font-mono-ui text-[10px] uppercase tracking-widest">{link.label}<ExternalLink className="h-3 w-3"/></a>)}</div></div>)}</div>)}</section>;
}
