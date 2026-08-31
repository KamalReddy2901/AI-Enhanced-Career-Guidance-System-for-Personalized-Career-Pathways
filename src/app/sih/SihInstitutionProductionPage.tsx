import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { AggregateAnalyticsPoint, AggregateAnalyticsResult, AggregateMetric } from '../domain/analytics';
import type { IsoTimestamp, OrganizationId } from '../domain/shared';
import { supabase } from '../services/supabase';
import {
  ProductionInstitutionReads,
  type AnalyticsInstitutionScope,
} from '../services/sih/productionInstitutionReads';
import { useSihProduction } from './SihProductionContext';

const reportingWindowDays = 90;

const metricTitles: Partial<Record<AggregateMetric, string>> = {
  readiness_distribution: 'Readiness bands',
  evidence_gap_distribution: 'Evidence support gaps',
  capability_gap_distribution: 'Capability gaps',
  eligibility_gap_distribution: 'Eligibility blockers',
  application_funnel: 'Application funnel',
  outcome_distribution: 'Outcomes',
  requirement_pattern: 'Recurring required capability patterns',
  faculty_industry_engagement: 'Faculty–industry engagement',
};

const metricOrder: AggregateMetric[] = [
  'readiness_distribution',
  'evidence_gap_distribution',
  'capability_gap_distribution',
  'eligibility_gap_distribution',
  'application_funnel',
  'outcome_distribution',
  'requirement_pattern',
  'faculty_industry_engagement',
];

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pointLabel(point: AggregateAnalyticsPoint): string {
  const values = Object.values(point.dimensions);
  return values.length ? values.map(humanize).join(' · ') : humanize(point.metric);
}

function formatWindow(timestamp: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

function Notice({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">
      {children}
    </div>
  );
}

function MetricCell({ point }: { readonly point: AggregateAnalyticsPoint }) {
  return (
    <article className="border-2 border-black bg-white p-4 shadow-[3px_3px_0_#111]">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-black/55">
        {pointLabel(point)}
      </p>
      {point.suppressed ? (
        <div className="mt-3">
          <p className="text-lg font-black">Below reporting threshold</p>
          <p className="mt-1 text-xs leading-5 text-black/60">
            The exact numerator, denominator, and cell size are withheld.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-3xl font-black tabular-nums">
            {point.value}
            <span className="ml-1 text-base font-bold text-black/45">/ {point.denominator}</span>
          </p>
          <p className="mt-1 font-mono-ui text-[10px] uppercase text-black/50">
            Reportable subjects in cell: {point.cohortSize}
          </p>
        </div>
      )}
    </article>
  );
}

function MetricSection({ metric, points }: { readonly metric: AggregateMetric; readonly points: readonly AggregateAnalyticsPoint[] }) {
  if (points.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-black">{metricTitles[metric] ?? humanize(metric)}</h2>
        <p className="mt-1 text-xs leading-5 text-black/55">
          Descriptive tenant aggregate. Cells below the reporting threshold do not expose exact counts.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((point, index) => (
          <MetricCell key={`${metric}-${JSON.stringify(point.dimensions)}-${index}`} point={point} />
        ))}
      </div>
    </section>
  );
}

export function InstitutionSkillsIntelligencePage() {
  const { actorId, roles, loading: authorityLoading, error: authorityError } = useSihProduction();
  const service = useMemo(() => (supabase ? new ProductionInstitutionReads(supabase) : null), []);
  const [scopes, setScopes] = useState<AnalyticsInstitutionScope[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<OrganizationId | null>(null);
  const [result, setResult] = useState<AggregateAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const timeWindow = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - reportingWindowDays * 86_400_000);
    return {
      from: from.toISOString() as IsoTimestamp,
      to: to.toISOString() as IsoTimestamp,
    };
  }, []);

  useEffect(() => {
    if (!actorId || !service) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void service.listAuthorizedInstitutions()
      .then((items) => {
        if (!active) return;
        setScopes(items);
        setSelectedOrganizationId((current) => current ?? items[0]?.organizationId ?? null);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load aggregate analytics scope.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actorId, service]);

  useEffect(() => {
    if (!actorId || !service || !selectedOrganizationId) {
      setResult(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(undefined);
    void service.getSkillsIntelligence({
      organizationId: selectedOrganizationId,
      from: timeWindow.from,
      to: timeWindow.to,
    })
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((reason) => {
        if (active) {
          setResult(null);
          setError(reason instanceof Error ? reason.message : 'Unable to load institution Skills Intelligence.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actorId, selectedOrganizationId, service, timeWindow.from, timeWindow.to]);

  const authorizedRole = roles.has('institution_admin') || roles.has('policy_program_analyst');
  const selectedScope = scopes.find((scope) => scope.organizationId === selectedOrganizationId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">
        Skills Intelligence · aggregate only
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Institution Skills Intelligence</h1>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-black/65">
        Privacy-protected, institution-scoped signals from CareerCase tenant records. These views support human planning and intervention design; they do not rank candidates or establish causal impact.
      </p>

      <div className="mt-8 space-y-6">
        {authorityLoading ? <Notice>Loading authenticated analytics authority…</Notice> : null}
        {authorityError ? <Notice>{authorityError}</Notice> : null}
        {!authorityLoading && !actorId ? (
          <Notice>Sign in with a provisioned CareerCase institution or policy/program analytics role.</Notice>
        ) : null}
        {actorId && !authorizedRole ? (
          <Notice>Your authenticated role does not include institution aggregate analytics authority.</Notice>
        ) : null}
        {error ? <Notice>{error}</Notice> : null}

        {actorId && authorizedRole && !error && scopes.length === 0 && !loading ? (
          <Notice>No educational institution aggregate scope is authorized for this account.</Notice>
        ) : null}

        {actorId && authorizedRole && scopes.length > 0 ? (
          <>
            <section className="grid gap-4 border-2 border-black bg-[#f7f4ed] p-5 shadow-[4px_4px_0_#111] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <label htmlFor="analytics-institution" className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-black/60">
                  Authorized institution scope
                </label>
                <select
                  id="analytics-institution"
                  value={selectedOrganizationId ?? ''}
                  onChange={(event) => setSelectedOrganizationId(event.target.value as OrganizationId)}
                  className="mt-2 min-h-11 w-full border-2 border-black bg-white px-3 text-sm font-bold"
                >
                  {scopes.map((scope) => (
                    <option key={scope.organizationId} value={scope.organizationId}>
                      {scope.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-left md:text-right">
                <p className="font-mono-ui text-[10px] font-black uppercase text-black/50">Access mode</p>
                <p className="mt-1 font-black">
                  {selectedScope?.accessMode === 'policy_program_analyst' ? 'Aggregate policy / program view' : 'Institution administration view'}
                </p>
              </div>
            </section>

            {loading && !result ? <Notice>Computing privacy-protected aggregate view…</Notice> : null}

            {result ? (
              <>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <article className="border-2 border-black bg-black p-5 text-white shadow-[4px_4px_0_var(--accent-news)]">
                    <p className="font-mono-ui text-[10px] font-black uppercase text-white/60">Reporting cohort</p>
                    <p className="mt-2 text-3xl font-black">
                      {result.cohort?.suppressed ? 'Suppressed' : result.cohort?.size ?? '—'}
                    </p>
                  </article>
                  <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
                    <p className="font-mono-ui text-[10px] font-black uppercase text-black/50">Minimum cell size</p>
                    <p className="mt-2 text-3xl font-black">{result.query.minimumCohortSize}</p>
                  </article>
                  <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111] sm:col-span-2">
                    <p className="font-mono-ui text-[10px] font-black uppercase text-black/50">Reporting window · UTC</p>
                    <p className="mt-2 text-sm font-black">
                      {formatWindow(String(result.query.from))} → {formatWindow(String(result.query.to))}
                    </p>
                    <p className="mt-2 text-xs text-black/55">{result.sourceLabel}</p>
                  </article>
                </section>

                <Notice>
                  <strong>{result.privacy?.policyLabel ?? 'Aggregate reporting policy'}.</strong>{' '}
                  Exact values are withheld for cells below n={result.query.minimumCohortSize}. There is no individual drill-down from this surface.
                </Notice>

                {result.accessMode === 'institution_admin' && selectedOrganizationId ? (
                  <section className="flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-black p-5 text-white shadow-[4px_4px_0_var(--accent-news)]">
                    <div>
                      <h2 className="text-lg font-black">Turn a reportable signal into a human-owned action</h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-white/65">
                        The intervention workspace recomputes the selected aggregate cell server-side. Suppressed cells cannot be used to create an operational action.
                      </p>
                    </div>
                    <Link
                      to={`/institution/interventions?organizationId=${encodeURIComponent(selectedOrganizationId)}&from=${encodeURIComponent(String(result.query.from))}&to=${encodeURIComponent(String(result.query.to))}`}
                      className="min-h-11 bg-[#e7ff57] px-4 py-3 font-mono-ui text-[10px] font-black uppercase text-black"
                    >
                      Plan human intervention
                    </Link>
                  </section>
                ) : null}

                <div className="space-y-10">
                  {metricOrder.map((metric) => (
                    <MetricSection
                      key={metric}
                      metric={metric}
                      points={result.points.filter((point) => point.metric === metric)}
                    />
                  ))}
                </div>

                <section className="border-2 border-black bg-[#e7ff57] p-5 shadow-[4px_4px_0_#111]">
                  <h2 className="text-lg font-black">Interpretation boundary</h2>
                  <p className="mt-2 text-sm leading-6">
                    {result.scopeNote} Signals are descriptive. A human institution or program owner decides whether to launch a workshop, project clinic, mentoring cohort, faculty engagement, or other intervention and must evaluate later outcomes separately.
                  </p>
                  <p className="mt-3 font-mono-ui text-[10px] font-black uppercase text-black/60">
                    Methodology: {result.methodologyVersion} · Generated {formatWindow(result.generatedAt)}
                  </p>
                </section>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
