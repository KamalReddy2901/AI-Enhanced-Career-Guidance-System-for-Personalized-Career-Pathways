import { useMemo, useState } from 'react';
import type { Opportunity, OpportunityType, OpportunityVersion } from '../../../../domain';

interface OpportunityExplorerProps {
  readonly opportunities: readonly Opportunity[];
  readonly versions: readonly OpportunityVersion[];
  readonly onSelectOpportunity?: (opportunityId: Opportunity['id']) => void;
}

const TYPE_OPTIONS: readonly OpportunityType[] = [
  'job',
  'internship',
  'apprenticeship',
  'industrial_training',
  'faculty_internship',
  'live_project',
  'mentoring',
  'workshop',
  'guest_lecture',
  'fdp',
  'consultancy',
  'collaborative_research',
];

function formatLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function versionFor(
  opportunity: Opportunity,
  versions: readonly OpportunityVersion[],
): OpportunityVersion | undefined {
  return versions.find(version => version.id === opportunity.currentVersionId);
}

export function OpportunityExplorer({
  opportunities,
  versions,
  onSelectOpportunity,
}: OpportunityExplorerProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<OpportunityType | 'all'>('all');
  const [status, setStatus] = useState<Opportunity['status'] | 'all'>('all');

  const visibleOpportunities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return opportunities.filter(opportunity => {
      if (status !== 'all' && opportunity.status !== status) return false;
      const version = versionFor(opportunity, versions);
      if (!version) return false;
      if (type !== 'all' && version.type !== type) return false;
      if (!normalizedQuery) return true;

      const searchableText = [
        version.title,
        version.description,
        version.type,
        ...version.audiences,
        ...version.requirements.map(requirement => requirement.literalSourceWording),
      ].join(' ').toLocaleLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [opportunities, query, status, type, versions]);

  const hasFilters = query.trim().length > 0 || type !== 'all' || status !== 'all';

  function resetFilters() {
    setQuery('');
    setType('all');
    setStatus('all');
  }

  return (
    <section aria-labelledby="student-opportunity-explorer-title" className="grid gap-5">
      <header className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]">
        <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em]">Student opportunity explorer</p>
        <h1 id="student-opportunity-explorer-title" className="mt-1 text-3xl font-black tracking-tight">
          Find an opportunity
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/70">
          Search and filter the controlled opportunity catalogue. Filters only narrow what you see; they do not determine readiness or eligibility.
        </p>
      </header>

      <div className="border-2 border-black bg-[#f7f4ed] p-4" aria-label="Opportunity filters">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
          <label className="grid gap-1">
            <span className="font-mono-ui text-[10px] font-bold uppercase tracking-wide">Search</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              type="search"
              placeholder="Title, description, type, audience or requirement"
              className="min-h-11 border-2 border-black bg-white px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-black/20"
            />
          </label>

          <label className="grid gap-1">
            <span className="font-mono-ui text-[10px] font-bold uppercase tracking-wide">Type</span>
            <select
              value={type}
              onChange={event => setType(event.target.value as OpportunityType | 'all')}
              className="min-h-11 border-2 border-black bg-white px-3 text-sm"
            >
              <option value="all">All types</option>
              {TYPE_OPTIONS.map(option => <option key={option} value={option}>{formatLabel(option)}</option>)}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="font-mono-ui text-[10px] font-bold uppercase tracking-wide">Status</span>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as Opportunity['status'] | 'all')}
              className="min-h-11 border-2 border-black bg-white px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="min-h-11 border-2 border-black bg-white px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      <div aria-live="polite" className="font-mono-ui text-xs font-bold uppercase tracking-wide">
        {visibleOpportunities.length} {visibleOpportunities.length === 1 ? 'opportunity' : 'opportunities'} shown
      </div>

      {visibleOpportunities.length === 0 ? (
        <div className="border-2 border-dashed border-black bg-white p-6" role="status">
          <h2 className="text-xl font-black">No opportunities match those filters.</h2>
          <p className="mt-2 text-sm text-black/70">Try a broader search or reset the filters.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 border-2 border-black bg-[#e7ff57] px-4 py-2 font-mono-ui text-xs font-black uppercase"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" aria-label="Opportunity results">
          {visibleOpportunities.map(opportunity => {
            const version = versionFor(opportunity, versions);
            if (!version) return null;

            return (
              <article key={opportunity.id} className="flex h-full flex-col border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="border border-black bg-[#f7f4ed] px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">
                    {formatLabel(version.type)}
                  </span>
                  <span className="font-mono-ui text-[10px] font-bold uppercase">{formatLabel(opportunity.status)}</span>
                </div>

                <h2 className="mt-4 text-xl font-black leading-tight">{version.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-black/70">{version.description}</p>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-black/20 pt-4">
                  <div>
                    <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/55">Version</dt>
                    <dd className="mt-1 text-sm font-black">v{version.version}</dd>
                  </div>
                  <div>
                    <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/55">Source</dt>
                    <dd className="mt-1 break-words text-sm font-black">{version.source.sourceSystem}</dd>
                  </div>
                </dl>

                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    onClick={() => onSelectOpportunity?.(opportunity.id)}
                    className="min-h-11 w-full border-2 border-black bg-[#e7ff57] px-4 py-2 text-left font-mono-ui text-xs font-black uppercase focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25"
                    aria-label={`Open ${version.title}`}
                  >
                    Open opportunity →
                  </button>
                  <p className="mt-2 break-all font-mono-ui text-[9px] text-black/45">Opportunity ID: {opportunity.id}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
