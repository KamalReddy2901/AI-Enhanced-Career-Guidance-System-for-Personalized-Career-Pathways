import { useEffect, useMemo, useState } from 'react';
import type { AggregateAnalyticsPoint, AggregateAnalyticsResult, AggregateMetric } from '../domain/analytics';
import type { IsoTimestamp, OpportunityVersionId, OrganizationId } from '../domain/shared';
import {
  ProductionIndustryReads,
  type AnalyticsIndustryOpportunityScope,
  type AnalyticsIndustryScope,
} from '../services/sih/productionIndustryReads';
import { supabase } from '../services/supabase';
import { useSihProduction } from './SihProductionContext';

const reportingWindowDays = 90;

const metricOrder: AggregateMetric[] = [
  'application_count',
  'eligibility_distribution',
  'readiness_distribution',
  'requirement_support_distribution',
  'evidence_gap_distribution',
  'application_funnel',
  'evidence_request_burden',
  'outcome_distribution',
  'requirement_pattern',
];

const metricTitles: Partial<Record<AggregateMetric, string>> = {
  application_count: 'Consented submitted applications',
  eligibility_distribution: 'Eligibility status',
  readiness_distribution: 'Readiness bands',
  requirement_support_distribution: 'Requirement support',
  evidence_gap_distribution: 'Evidence support gaps',
  application_funnel: 'Current application stages',
  evidence_request_burden: 'Evidence-request burden',
  outcome_distribution: 'Recorded outcomes',
  requirement_pattern: 'Published requirement patterns',
};

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pointLabel(point: AggregateAnalyticsPoint): string {
  const preferred = ['requirementLabel', 'eligibilityStatus', 'readinessBand', 'requirementState', 'stage', 'outcomeKind', 'gapKind', 'event', 'scope'];
  const values = preferred
    .map((key) => point.dimensions[key])
    .filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.map(humanize).join(' · ') : humanize(point.metric);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function Notice({ children }: { readonly children: React.ReactNode }) {
  return <div className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function MetricCell({ point }: { readonly point: AggregateAnalyticsPoint }) {
  return (
    <article className="border-2 border-black bg-white p-4 shadow-[3px_3px_0_#111]">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-black/55">{pointLabel(point)}</p>
      {point.suppressed ? (
        <div className="mt-3">
          <p className="text-lg font-black">Below reporting threshold</p>
          <p className="mt-1 text-xs leading-5 text-black/60">Exact numerator, denominator and cell size are withheld.</p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-3xl font-black tabular-nums">
            {point.value}
            <span className="ml-1 text-base font-bold text-black/45">/ {point.denominator}</span>
          </p>
          <p className="mt-1 font-mono-ui text-[10px] uppercase text-black/50">Reportable cohort in cell: {point.cohortSize}</p>
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
        <p className="mt-1 text-xs leading-5 text-black/55">Descriptive employer aggregate only. Suppressed cells never expose hidden exact counts.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((point, index) => (
          <MetricCell key={`${metric}-${JSON.stringify(point.dimensions)}-${index}`} point={point} />
        ))}
      </div>
    </section>
  );
}

export function IndustrySkillsIntelligencePage() {
  const { actorId, roles, loading: authorityLoading, error: authorityError } = useSihProduction();
  const service = useMemo(() => (supabase ? new ProductionIndustryReads(supabase) : null), []);
  const [organizations, setOrganizations] = useState<AnalyticsIndustryScope[]>([]);
  const [opportunities, setOpportunities] = useState<AnalyticsIndustryOpportunityScope[]>([]);
  const [organizationId, setOrganizationId] = useState<OrganizationId | null>(null);
  const [opportunityVersionId, setOpportunityVersionId] = useState<OpportunityVersionId | null>(null);
  const [result, setResult] = useState<AggregateAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const timeWindow = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - reportingWindowDays * 86_400_000);
    return { from: from.toISOString() as IsoTimestamp, to: to.toISOString() as IsoTimestamp };
  }, []);

  useEffect(() => {
    if (!actorId || !service) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void service.listAuthorizedOrganizations()
      .then((items) => {
        if (!active) return;
        setOrganizations(items);
        setOrganizationId((current) => current ?? items[0]?.organizationId ?? null);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load employer analytics authority.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [actorId, service]);

  useEffect(() => {
    if (!service || !organizationId) {
      setOpportunities([]);
      setOpportunityVersionId(null);
      return;
    }
    let active = true;
    void service.listAuthorizedOpportunities(organizationId)
      .then((items) => {
        if (!active) return;
        setOpportunities(items);
        setOpportunityVersionId(null);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load employer opportunity scope.');
      });
    return () => { active = false; };
  }, [organizationId, service]);

  useEffect(() => {
    if (!service || !actorId || !organizationId) {
      setResult(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(undefined);
    void service.getSkillsIntelligence({
      organizationId,
      ...(opportunityVersionId ? { opportunityVersionId } : {}),
      from: timeWindow.from,
      to: timeWindow.to,
    })
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((reason) => {
        if (active) {
          setResult(null);
          setError(reason instanceof Error ? reason.message : 'Unable to load employer Skills Intelligence.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [actorId, opportunityVersionId, organizationId, service, timeWindow.from, timeWindow.to]);

  const authorizedRole = roles.has('recruiter') || roles.has('industry_partner');
  const selectedOrganization = organizations.find((scope) => scope.organizationId === organizationId);
  const selectedOpportunity = opportunities.find((scope) => scope.opportunityVersionId === opportunityVersionId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">Industry · Skills Intelligence · aggregate only</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Employer Skills Intelligence</h1>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-black/65">
        Privacy-protected descriptive signals for an authenticated employer or one exact published opportunity version. This surface does not rank applicants, predict hiring, or expose private Career Guidance inputs.
      </p>

      <div className="mt-8 space-y-6">
        {authorityLoading ? <Notice>Loading authenticated employer analytics authority…</Notice> : null}
        {authorityError ? <Notice>{authorityError}</Notice> : null}
        {!authorityLoading && !actorId ? <Notice>Sign in with a provisioned recruiter or industry-partner role.</Notice> : null}
        {actorId && !authorizedRole ? <Notice>Your authenticated role does not include employer Skills Intelligence authority.</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        {actorId && authorizedRole && !error && organizations.length === 0 && !loading ? <Notice>No employer analytics organization scope is authorized for this account.</Notice> : null}

        {actorId && authorizedRole && organizations.length > 0 ? (
          <>
            <section className="grid gap-4 border-2 border-black bg-[#fff4c7] p-5 shadow-[4px_4px_0_#111] lg:grid-cols-2">
              <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase tracking-wide">
                Employer organization
                <select
                  value={organizationId ?? ''}
                  onChange={(event) => setOrganizationId(event.target.value as OrganizationId)}
                  className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case"
                >
                  {organizations.map((scope) => <option key={scope.organizationId} value={scope.organizationId}>{scope.displayName}</option>)}
                </select>
              </label>
              <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase tracking-wide">
                Opportunity scope
                <select
                  value={opportunityVersionId ?? ''}
                  onChange={(event) => setOpportunityVersionId(event.target.value ? event.target.value as OpportunityVersionId : null)}
                  className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case"
                >
                  <option value="">All published employer opportunities</option>
                  {opportunities.map((scope) => <option key={scope.opportunityVersionId} value={scope.opportunityVersionId}>{scope.title} · {humanize(scope.opportunityType)}</option>)}
                </select>
              </label>
              <div className="text-xs leading-5 text-black/60 lg:col-span-2">
                Acting as <strong>{selectedOrganization?.accessMode === 'recruiter' ? 'Recruiter' : 'Industry partner'}</strong>. Applicant-derived cells include only exact submitted snapshots whose subjects currently hold active <code>aggregate_analytics</code> consent for this employer.
              </div>
            </section>

            {loading && !result ? <Notice>Computing privacy-protected employer aggregates…</Notice> : null}

            {result ? (
              <>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <article className="border-2 border-black bg-black p-5 text-white shadow-[4px_4px_0_#d63c1d]">
                    <p className="font-mono-ui text-[10px] font-black uppercase text-white/60">Consented cohort</p>
                    <p className="mt-2 text-3xl font-black">{result.cohort?.suppressed ? 'Suppressed' : result.cohort?.size ?? '—'}</p>
                  </article>
                  <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
                    <p className="font-mono-ui text-[10px] font-black uppercase text-black/50">Minimum cell size</p>
                    <p className="mt-2 text-3xl font-black">{result.query.minimumCohortSize}</p>
                  </article>
                  <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111] sm:col-span-2">
                    <p className="font-mono-ui text-[10px] font-black uppercase text-black/50">Reporting scope · UTC</p>
                    <p className="mt-2 text-sm font-black">{formatDate(String(result.query.from))} → {formatDate(String(result.query.to))}</p>
                    <p className="mt-2 text-xs text-black/55">{selectedOpportunity ? `Exact opportunity version: ${selectedOpportunity.title}` : 'Organization-wide published opportunity scope'}</p>
                  </article>
                </section>

                <Notice>
                  <strong>{result.privacy?.policyLabel ?? 'Aggregate reporting policy'}.</strong>{' '}
                  Cells below n={result.query.minimumCohortSize} withhold exact numerator, denominator and cohort size. There is no individual drill-down from this analytics surface.
                </Notice>

                <div className="space-y-10">
                  {metricOrder.map((metric) => (
                    <MetricSection key={metric} metric={metric} points={result.points.filter((point) => point.metric === metric)} />
                  ))}
                </div>

                <section className="border-2 border-black bg-[#e7ff57] p-5 shadow-[4px_4px_0_#111]">
                  <h2 className="text-lg font-black">Interpretation boundary</h2>
                  <p className="mt-2 text-sm leading-6">{result.scopeNote}</p>
                  <p className="mt-3 text-sm leading-6">
                    Requirement patterns describe this employer's CareerCase-authored opportunities in the selected window. They are not presented as national labour-market demand. Human recruiters and industry partners decide how to respond; these aggregates never shortlist or reject candidates automatically.
                  </p>
                  <p className="mt-3 font-mono-ui text-[10px] font-black uppercase text-black/60">Methodology: {result.methodologyVersion} · Generated {formatDate(result.generatedAt)}</p>
                </section>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default IndustrySkillsIntelligencePage;
