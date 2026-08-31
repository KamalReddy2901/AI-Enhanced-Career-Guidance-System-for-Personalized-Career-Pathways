import type { OpportunityVersion, OpportunityReadinessResult } from '../../../../domain';
import { buildGapClosureActions, type GapClosureAction, type GapPlanGroupKind } from './gapActionMapping';

export interface GapClosureHandoff {
  readonly opportunityId: string;
  readonly opportunityVersionId: string;
  readonly readinessResultId: string;
  readonly requirementId?: string;
  readonly action: GapClosureAction;
}

type Props = {
  readonly result?: OpportunityReadinessResult;
  readonly opportunityVersion?: OpportunityVersion;
  readonly availability?: 'loading' | 'unavailable' | 'error' | 'unauthorized';
  readonly errorMessage?: string;
  readonly onEvidenceHandoff?: (handoff: GapClosureHandoff) => void;
  readonly onDevelopmentProgramHandoff?: (handoff: GapClosureHandoff) => void;
};

const headings: Record<GapPlanGroupKind, string> = { evidence: 'Evidence to strengthen', capability: 'Capability actions', eligibility: 'Eligibility to resolve', logistics: 'Logistics to resolve', unknown: 'Information to discover first' };
const order: GapPlanGroupKind[] = ['unknown', 'evidence', 'capability', 'eligibility', 'logistics'];
const label = (value: string) => value.replaceAll('_', ' ');

function productionProgramHref(action: GapClosureAction): string | undefined {
  if (!action.canonicalSkillId) return undefined;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) return undefined;
  const params = new URLSearchParams({ canonicalSkillId: action.canonicalSkillId });
  if (action.requirementId) params.set('requirementId', action.requirementId);
  params.set('source', 'gap-closure');
  return `/development?${params.toString()}`;
}

export function GapClosurePlan({ result, opportunityVersion, availability, errorMessage, onEvidenceHandoff, onDevelopmentProgramHandoff }: Props) {
  if (availability || !result || !opportunityVersion) {
    const copy = availability === 'loading' ? 'The canonical readiness result is loading.' : availability === 'unauthorized' ? 'This plan is not available for the current viewer.' : availability === 'error' ? errorMessage ?? 'The gap-closure plan could not be prepared.' : 'A current canonical readiness result is required before a plan can be prepared.';
    return <section className="border-2 border-black bg-white p-5" aria-live="polite"><h1 className="text-2xl font-black">Gap-closure plan unavailable</h1><p className="mt-3 text-sm text-black/70">{copy}</p></section>;
  }
  const stale = result.opportunityId !== opportunityVersion.opportunityId || result.opportunityVersionId !== opportunityVersion.id;
  if (stale) return <section className="border-2 border-[#d63c1d] bg-[#fff1ec] p-5" aria-live="polite"><h1 className="text-2xl font-black">Stale readiness result</h1><p className="mt-3 text-sm">This plan is blocked because the readiness and opportunity versions do not match.</p></section>;
  const actions = buildGapClosureActions(result, opportunityVersion);
  return <section className="grid gap-6" aria-labelledby="gap-closure-plan-title">
    <header className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]"><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em]">Student action plan</p><h1 id="gap-closure-plan-title" className="mt-1 text-3xl font-black">Close evidence and readiness gaps carefully</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/70">Actions are linked to the canonical result. They do not recalculate readiness, promise a result, or represent hiring likelihood.</p></header>
    {actions.length === 0 ? <div className="border-2 border-dashed border-black bg-white p-5"><h2 className="text-xl font-black">No closure actions are currently indicated.</h2><p className="mt-2 text-sm text-black/70">Current requirements are either strongly supported or not applicable.</p></div> : order.map(group => {
      const items = actions.filter(action => action.group === group); if (!items.length) return null;
      return <section key={group} aria-labelledby={`${group}-actions`}><h2 id={`${group}-actions`} className="text-2xl font-black">{headings[group]}</h2><div className="mt-3 grid gap-3">{items.map(action => {
        const programHref = productionProgramHref(action);
        const handoff = { opportunityId: result.opportunityId, opportunityVersionId: result.opportunityVersionId, readinessResultId: result.resultId, requirementId: action.requirementId, action };
        return <article key={action.id} className="border-2 border-black bg-[#f7f4ed] p-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold leading-relaxed">{action.title}</h3><span className="border border-black bg-white px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">{label(action.kind)}</span></div><p className="mt-3 text-sm leading-relaxed">{action.reason}</p><p className="mt-3 text-xs text-black/65"><span className="font-bold">Expected evidence or result:</span> {action.expectedEvidence}</p>{action.kind === 'PROVE_EXISTING' && onEvidenceHandoff && <button type="button" onClick={() => onEvidenceHandoff(handoff)} className="mt-4 min-h-11 border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">Continue to evidence</button>}{action.kind === 'LEARN' && action.canonicalSkillId && onDevelopmentProgramHandoff && <button type="button" onClick={() => onDevelopmentProgramHandoff(handoff)} className="mt-4 min-h-11 border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">Explore exact-linked programs</button>}{action.kind === 'LEARN' && action.canonicalSkillId && !onDevelopmentProgramHandoff && programHref && <a href={programHref} className="mt-4 inline-flex min-h-11 items-center border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">Explore exact-linked programs</a>}{action.kind === 'LEARN' && !action.canonicalSkillId && <p className="mt-4 border-l-4 border-black pl-3 text-xs text-black/60">No automatic program filter is offered because this requirement lacks an authoritative canonical skill resolution. CareerCase will not guess one.</p>}</article>;
      })}</div></section>;
    })}
  </section>;
}

export default GapClosurePlan;
