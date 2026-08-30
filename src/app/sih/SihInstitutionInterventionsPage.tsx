import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type {
  AggregateAnalyticsPoint,
  AggregateAnalyticsResult,
  InstitutionIntervention,
  InstitutionInterventionKind,
  InstitutionInterventionStatus,
  IsoTimestamp,
  OrganizationId,
} from '../domain';
import { supabase } from '../services/supabase';
import {
  ProductionInstitutionReads,
  type AnalyticsInstitutionScope,
} from '../services/sih/productionInstitutionReads';
import { ProductionInstitutionInterventions } from '../services/sih/productionInstitutionInterventions';
import { useSihProduction } from './SihProductionContext';

const sourceWindowDays = 90;
const followupWindowDays = 30;

const kinds: Array<{ value: InstitutionInterventionKind; label: string }> = [
  { value: 'evidence_clinic', label: 'Evidence clinic' },
  { value: 'project_clinic', label: 'Project clinic' },
  { value: 'training_support', label: 'Training / support cohort' },
  { value: 'mentoring_cohort', label: 'Mentoring cohort' },
  { value: 'employer_outreach', label: 'Employer outreach' },
  { value: 'faculty_industry_engagement', label: 'Faculty–industry engagement' },
  { value: 'opportunity_outreach', label: 'Opportunity outreach' },
  { value: 'curriculum_program_review', label: 'Curriculum / program review' },
  { value: 'other', label: 'Other human-owned intervention' },
];

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pointLabel(point: AggregateAnalyticsPoint): string {
  const dimensions = Object.values(point.dimensions).map(humanize).join(' · ');
  return `${humanize(point.metric)}${dimensions ? ` · ${dimensions}` : ''} · ${point.value}/${point.denominator}`;
}

function defaultWindow(days: number): { from: IsoTimestamp; to: IsoTimestamp } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString() as IsoTimestamp, to: to.toISOString() as IsoTimestamp };
}

function validTimestamp(value: string | null): value is IsoTimestamp {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function Notice({ children }: { readonly children: React.ReactNode }) {
  return <div className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function statusActions(status: InstitutionInterventionStatus): Array<{ status: InstitutionInterventionStatus; label: string }> {
  if (status === 'draft') return [{ status: 'approved', label: 'Approve' }, { status: 'cancelled', label: 'Cancel' }];
  if (status === 'approved') return [{ status: 'active', label: 'Start' }, { status: 'cancelled', label: 'Cancel' }];
  if (status === 'active') return [{ status: 'completed', label: 'Complete' }, { status: 'cancelled', label: 'Cancel' }];
  return [];
}

function InterventionCard({
  intervention,
  busy,
  onTransition,
  onFollowup,
}: {
  readonly intervention: InstitutionIntervention;
  readonly busy: boolean;
  readonly onTransition: (status: InstitutionInterventionStatus) => void;
  readonly onFollowup: () => void;
}) {
  const canFollowup = intervention.status === 'active' || intervention.status === 'completed';
  return (
    <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-[#d63c1d]">
            {humanize(intervention.kind)}
          </p>
          <h3 className="mt-1 text-xl font-black">{intervention.title}</h3>
        </div>
        <span className="border-2 border-black bg-[#e7ff57] px-3 py-1 font-mono-ui text-[10px] font-black uppercase">
          {humanize(intervention.status)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-black/70">{intervention.rationale}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border border-black/20 bg-[#f7f4ed] p-3">
          <p className="font-mono-ui text-[9px] font-black uppercase text-black/45">Human action</p>
          <p className="mt-1 text-sm">{intervention.actionDescription}</p>
        </div>
        <div className="border border-black/20 bg-[#f7f4ed] p-3">
          <p className="font-mono-ui text-[9px] font-black uppercase text-black/45">Cohort / program scope</p>
          <p className="mt-1 text-sm">{intervention.intendedPopulationDescription}</p>
        </div>
      </div>

      <div className="mt-4 border-l-4 border-black pl-3 text-xs leading-5 text-black/60">
        <strong>Source signal:</strong> {humanize(intervention.source.metric)} · {Object.values(intervention.source.dimensions).map(humanize).join(' · ')} · {intervention.source.value}/{intervention.source.denominator} from a reportable cell of n={intervention.source.cohortSize}. This is a descriptive planning signal, not proof that the intervention will cause an outcome.
      </div>

      {intervention.latestFollowup ? (
        <div className="mt-4 border-2 border-black bg-black p-4 text-white">
          <p className="font-mono-ui text-[9px] font-black uppercase text-white/55">Latest aggregate follow-up</p>
          {intervention.latestFollowup.suppressed ? (
            <p className="mt-2 text-sm font-black">Below reporting threshold — exact follow-up counts withheld.</p>
          ) : (
            <p className="mt-2 text-lg font-black">
              {intervention.latestFollowup.value}/{intervention.latestFollowup.denominator} · n={intervention.latestFollowup.cohortSize}
            </p>
          )}
          <p className="mt-2 text-xs leading-5 text-white/65">
            {humanize(intervention.latestFollowup.interpretation)} observation only. causalClaimed=false.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {statusActions(intervention.status).map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={busy}
            onClick={() => onTransition(action.status)}
            className="min-h-11 border-2 border-black px-4 font-mono-ui text-[10px] font-black uppercase disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
        {canFollowup ? (
          <button
            type="button"
            disabled={busy}
            onClick={onFollowup}
            className="min-h-11 bg-black px-4 font-mono-ui text-[10px] font-black uppercase text-white disabled:opacity-40"
          >
            Record descriptive follow-up
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function InstitutionInterventionsPage() {
  const { actorId, roles, loading: authorityLoading, error: authorityError } = useSihProduction();
  const [searchParams] = useSearchParams();
  const analyticsService = useMemo(() => (supabase ? new ProductionInstitutionReads(supabase) : null), []);
  const interventionService = useMemo(() => (supabase ? new ProductionInstitutionInterventions(supabase) : null), []);

  const initialWindow = useMemo(() => {
    const fallback = defaultWindow(sourceWindowDays);
    return {
      from: validTimestamp(searchParams.get('from')) ? searchParams.get('from') as IsoTimestamp : fallback.from,
      to: validTimestamp(searchParams.get('to')) ? searchParams.get('to') as IsoTimestamp : fallback.to,
    };
  }, [searchParams]);

  const [scopes, setScopes] = useState<AnalyticsInstitutionScope[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<OrganizationId | null>(null);
  const [report, setReport] = useState<AggregateAnalyticsResult | null>(null);
  const [interventions, setInterventions] = useState<InstitutionIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();

  const [kind, setKind] = useState<InstitutionInterventionKind>('evidence_clinic');
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [populationDescription, setPopulationDescription] = useState('');
  const [selectedPointKey, setSelectedPointKey] = useState('');

  const adminRole = roles.has('institution_admin');

  useEffect(() => {
    if (!actorId || !analyticsService || !adminRole) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void analyticsService.listAuthorizedInstitutions()
      .then((items) => {
        if (!active) return;
        const managed = items.filter((scope) => scope.accessMode === 'institution_admin');
        setScopes(managed);
        const requested = searchParams.get('organizationId');
        const requestedScope = managed.find((scope) => scope.organizationId === requested);
        setSelectedOrganizationId(requestedScope?.organizationId ?? managed[0]?.organizationId ?? null);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load institution intervention scope.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [actorId, adminRole, analyticsService, searchParams]);

  const reload = useCallback(async () => {
    if (!selectedOrganizationId || !analyticsService || !interventionService) return;
    setLoading(true);
    setError(undefined);
    try {
      const [nextReport, nextInterventions] = await Promise.all([
        analyticsService.getSkillsIntelligence({
          organizationId: selectedOrganizationId,
          from: initialWindow.from,
          to: initialWindow.to,
        }),
        interventionService.list(selectedOrganizationId),
      ]);
      setReport(nextReport);
      setInterventions(nextInterventions);
    } catch (reason) {
      setReport(null);
      setInterventions([]);
      setError(reason instanceof Error ? reason.message : 'Unable to load institution interventions.');
    } finally {
      setLoading(false);
    }
  }, [analyticsService, initialWindow.from, initialWindow.to, interventionService, selectedOrganizationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sourcePoints = useMemo(
    () => report?.points.filter((point) => !point.suppressed && point.cohortSize !== null && point.cohortSize >= report.query.minimumCohortSize) ?? [],
    [report],
  );

  useEffect(() => {
    if (sourcePoints.length === 0) {
      setSelectedPointKey('');
      return;
    }
    const valid = sourcePoints.some((point) => JSON.stringify({ metric: point.metric, dimensions: point.dimensions }) === selectedPointKey);
    if (!valid) setSelectedPointKey(JSON.stringify({ metric: sourcePoints[0].metric, dimensions: sourcePoints[0].dimensions }));
  }, [selectedPointKey, sourcePoints]);

  const selectedPoint = sourcePoints.find(
    (point) => JSON.stringify({ metric: point.metric, dimensions: point.dimensions }) === selectedPointKey,
  );

  async function createIntervention(event: React.FormEvent) {
    event.preventDefault();
    if (!interventionService || !selectedOrganizationId || !report || !selectedPoint) return;
    setBusyId('create');
    setError(undefined);
    try {
      await interventionService.create({
        organizationId: selectedOrganizationId,
        kind,
        title,
        rationale,
        actionDescription,
        intendedPopulationDescription: populationDescription,
        sourceWindowFrom: initialWindow.from,
        sourceWindowTo: initialWindow.to,
        sourceMethodologyVersion: report.methodologyVersion,
        sourceMetric: selectedPoint.metric,
        sourceDimensions: selectedPoint.dimensions,
      });
      setTitle('');
      setRationale('');
      setActionDescription('');
      setPopulationDescription('');
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create institution intervention.');
    } finally {
      setBusyId(undefined);
    }
  }

  async function transition(intervention: InstitutionIntervention, status: InstitutionInterventionStatus) {
    if (!interventionService) return;
    setBusyId(intervention.id);
    setError(undefined);
    try {
      await interventionService.transition(intervention.id, status);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update institution intervention.');
    } finally {
      setBusyId(undefined);
    }
  }

  async function recordFollowup(intervention: InstitutionIntervention) {
    if (!interventionService) return;
    const window = defaultWindow(followupWindowDays);
    setBusyId(intervention.id);
    setError(undefined);
    try {
      await interventionService.recordFollowup({
        interventionId: intervention.id,
        windowFrom: window.from,
        windowTo: window.to,
        interpretation: 'descriptive',
        interpretationNote: 'Human-requested aggregate follow-up. Observed association only; no causal inference.',
      });
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record intervention follow-up.');
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">
            Institution actions · human owned
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Institution Interventions</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-black/65">
            Convert reportable Skills Intelligence signals into explicit human-owned actions, then record separate aggregate follow-up. The workflow does not automatically prescribe an action, target an individual, or claim that an intervention caused an outcome.
          </p>
        </div>
        <Link
          to="/institution/skills-intelligence"
          className="min-h-11 border-2 border-black px-4 py-3 font-mono-ui text-[10px] font-black uppercase"
        >
          Back to Skills Intelligence
        </Link>
      </div>

      <div className="mt-8 space-y-6">
        {authorityLoading ? <Notice>Loading authenticated institution authority…</Notice> : null}
        {authorityError ? <Notice>{authorityError}</Notice> : null}
        {!authorityLoading && !actorId ? <Notice>Sign in with a provisioned institution administrator account.</Notice> : null}
        {actorId && !adminRole ? (
          <Notice>This operational workspace requires institution-admin authority. Policy/program analytics remains aggregate-only.</Notice>
        ) : null}
        {error ? <Notice>{error}</Notice> : null}

        {actorId && adminRole && scopes.length === 0 && !loading ? (
          <Notice>No educational institution operational scope is authorized for this account.</Notice>
        ) : null}

        {actorId && adminRole && scopes.length > 0 ? (
          <>
            <section className="border-2 border-black bg-[#f7f4ed] p-5 shadow-[4px_4px_0_#111]">
              <label htmlFor="intervention-institution" className="font-mono-ui text-[10px] font-black uppercase text-black/55">
                Managed institution
              </label>
              <select
                id="intervention-institution"
                value={selectedOrganizationId ?? ''}
                onChange={(event) => setSelectedOrganizationId(event.target.value as OrganizationId)}
                className="mt-2 min-h-11 w-full border-2 border-black bg-white px-3 text-sm font-bold md:max-w-xl"
              >
                {scopes.map((scope) => (
                  <option key={scope.organizationId} value={scope.organizationId}>{scope.displayName}</option>
                ))}
              </select>
            </section>

            {loading && !report ? <Notice>Loading reportable aggregate signals and intervention history…</Notice> : null}

            {report ? (
              <form onSubmit={createIntervention} className="space-y-5 border-2 border-black bg-[#e7ff57] p-6 shadow-[5px_5px_0_#111]">
                <div>
                  <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-black/55">Create from a reportable aggregate signal</p>
                  <h2 className="mt-1 text-2xl font-black">Plan a human intervention</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6">
                    The server recomputes the selected Skills Intelligence cell before creation. Suppressed cells cannot be used as an intervention source. The intervention stores aggregate provenance, not learner-level records.
                  </p>
                </div>

                {sourcePoints.length === 0 ? (
                  <Notice>No reportable aggregate cell is currently available for intervention planning in this reporting window.</Notice>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-bold">
                      Source signal
                      <select
                        value={selectedPointKey}
                        onChange={(event) => setSelectedPointKey(event.target.value)}
                        className="mt-1 min-h-11 w-full border-2 border-black bg-white px-3 font-normal"
                      >
                        {sourcePoints.map((point) => {
                          const key = JSON.stringify({ metric: point.metric, dimensions: point.dimensions });
                          return <option key={key} value={key}>{pointLabel(point)}</option>;
                        })}
                      </select>
                    </label>
                    <label className="text-sm font-bold">
                      Intervention type
                      <select
                        value={kind}
                        onChange={(event) => setKind(event.target.value as InstitutionInterventionKind)}
                        className="mt-1 min-h-11 w-full border-2 border-black bg-white px-3 font-normal"
                      >
                        {kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-bold md:col-span-2">
                      Title
                      <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={200} className="mt-1 min-h-11 w-full border-2 border-black bg-white px-3 font-normal" />
                    </label>
                    <label className="text-sm font-bold md:col-span-2">
                      Why this action is being considered
                      <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} required minLength={3} maxLength={2000} rows={3} className="mt-1 w-full border-2 border-black bg-white p-3 font-normal" />
                    </label>
                    <label className="text-sm font-bold md:col-span-2">
                      Human-owned action
                      <textarea value={actionDescription} onChange={(event) => setActionDescription(event.target.value)} required minLength={3} maxLength={4000} rows={3} className="mt-1 w-full border-2 border-black bg-white p-3 font-normal" />
                    </label>
                    <label className="text-sm font-bold md:col-span-2">
                      Cohort / program scope — no learner names or identifiers
                      <textarea value={populationDescription} onChange={(event) => setPopulationDescription(event.target.value)} required minLength={3} maxLength={1000} rows={2} className="mt-1 w-full border-2 border-black bg-white p-3 font-normal" />
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedPoint || busyId === 'create'}
                  className="min-h-11 bg-black px-5 font-mono-ui text-[10px] font-black uppercase text-white disabled:opacity-40"
                >
                  Create draft intervention
                </button>
              </form>
            ) : null}

            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-black">Human intervention history</h2>
                <p className="mt-1 text-sm text-black/60">Lifecycle changes are append-only and attributed to the authenticated institution administrator.</p>
              </div>
              {!loading && interventions.length === 0 ? <Notice>No interventions recorded for this institution yet.</Notice> : null}
              <div className="grid gap-5 lg:grid-cols-2">
                {interventions.map((intervention) => (
                  <InterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    busy={busyId === intervention.id}
                    onTransition={(status) => void transition(intervention, status)}
                    onFollowup={() => void recordFollowup(intervention)}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
