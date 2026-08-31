import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import type { Actor, CollaborationEngagement, CollaborationEngagementEvent, CollaborationEventKind, Organization } from '../domain';
import { FacultyExplorer } from '../components/sih/faculty/FacultyExplorer';
import { FacultyCollaborationDetail } from '../components/sih/faculty/FacultyCollaborationDetail';
import {
  ProductionFacultyReads,
  type ProductionFacultyCollaborationBundle,
} from '../services/sih/productionFacultyReads';
import { ProductionFacultyLifecycle } from '../services/sih/productionFacultyLifecycle';
import { supabase } from '../services/supabase';
import { useSihProduction } from './SihProductionContext';

function FacultyFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  const { loading, error, actorId } = useSihProduction();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">{description}</p>
      {loading ? (
        <Notice>Loading authenticated collaboration authority…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : !actorId ? (
        <Notice>Sign in with a provisioned CareerCase role to use this production workspace.</Notice>
      ) : (
        <div className="mt-8">{children}</div>
      )}
    </div>
  );
}

function Notice({ children }: { readonly children: ReactNode }) {
  return <div className="mt-6 border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function useFacultyReads() {
  return useMemo(() => (supabase ? new ProductionFacultyReads(supabase) : null), []);
}

function useFacultyLifecycle() {
  return useMemo(() => (supabase ? new ProductionFacultyLifecycle(supabase) : null), []);
}

function useFacultyBundle() {
  const { actorId } = useSihProduction();
  const reads = useFacultyReads();
  const [bundle, setBundle] = useState<ProductionFacultyCollaborationBundle>({
    engagements: [],
    events: [],
    organizations: [],
    visibleActors: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!actorId) {
      setLoading(false);
      return;
    }
    if (!reads) {
      setLoading(false);
      setError('Supabase is not configured for production collaboration reads.');
      return;
    }
    let active = true;
    setLoading(true);
    setError(undefined);
    void reads
      .listVisible()
      .then((next) => {
        if (active) setBundle(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load faculty–industry collaborations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actorId, reads, revision]);

  return { bundle, loading, error, refresh };
}

export function FacultyPage() {
  const { bundle, loading, error } = useFacultyBundle();

  return (
    <FacultyFrame
      eyebrow="Faculty · first-class academia–industry lifecycle"
      title="Faculty–Industry Collaboration"
      description="Discover authorized faculty internships, industrial training, FDPs, consultancy, collaborative research, mentoring, workshops, guest lectures and live projects. Records are read through existing SIH26044 RLS; inaccessible identities remain undisclosed."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Summary label="Visible engagements" value={bundle.engagements.length} />
        <Summary label="Visible organizations" value={bundle.organizations.length} />
        <Summary label="Visible participant identities" value={bundle.visibleActors.length} />
      </div>
      {loading ? (
        <Notice>Loading authorized collaboration records…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : bundle.engagements.length === 0 ? (
        <Notice>No faculty–industry collaboration engagements are visible to the current authority.</Notice>
      ) : (
        <FacultyExplorer
          collaborations={bundle.engagements}
          organizations={bundle.organizations}
          personas={bundle.visibleActors}
          detailBasePath="/faculty/collaborations"
        />
      )}
      <Notice>
        Production engagement details now carry an append-only lifecycle. Host-authorized status changes and participant milestones, deliverables, feedback and outcomes are persisted with exact actor attribution; an outcome does not automatically mint evidence.
      </Notice>
    </FacultyFrame>
  );
}

export function FacultyCollaborationDetailPage() {
  const { collaborationId } = useParams();
  const { actorId, memberships } = useSihProduction();
  const { bundle, loading, error, refresh } = useFacultyBundle();
  const lifecycle = useFacultyLifecycle();
  const engagement = collaborationId
    ? bundle.engagements.find((item) => item.id === collaborationId)
    : undefined;
  const events = engagement
    ? bundle.events.filter((item) => item.collaborationEngagementId === engagement.id)
    : [];
  const hostOperator = engagement
    ? memberships.some((membership) => membership.organizationId === engagement.hostOrganizationId
      && membership.roles.some((role) => role === 'faculty' || role === 'institution_admin' || role === 'industry_partner'))
    : false;
  const participant = Boolean(actorId && engagement?.participantActorIds.includes(actorId));

  return (
    <FacultyFrame
      eyebrow="Authorized collaboration record"
      title="Collaboration Detail"
      description="Canonical engagement details are reconstructed from the collaboration schema. Missing or hidden identities are not inferred."
    >
      {loading ? (
        <Notice>Loading authorized collaboration detail…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : (
        <FacultyCollaborationDetail
          engagement={engagement}
          organizations={bundle.organizations}
          personas={bundle.visibleActors}
          backHref="/faculty/collaborations"
          renderLocalWorkspace={false}
        />
      )}
      {engagement && (
        <>
          <FacultyLifecycleWorkspace
            engagement={engagement}
            events={events}
            lifecycle={lifecycle}
            canTransition={hostOperator}
            canRecordActivity={hostOperator || participant}
            onChanged={refresh}
          />
          <div className="mt-6 flex flex-wrap gap-3">
          {engagement.opportunityId && (
            <Link
              to="/faculty/opportunities"
              className="min-h-11 border-2 border-black bg-[#e7ff57] px-4 py-3 font-mono-ui text-xs font-black uppercase"
            >
              Related opportunities
            </Link>
          )}
          <Link
            to="/verification"
            className="min-h-11 border-2 border-black px-4 py-3 font-mono-ui text-xs font-black uppercase"
          >
            Scoped verification
          </Link>
          </div>
        </>
      )}
    </FacultyFrame>
  );
}

const nextStatuses: Readonly<Record<CollaborationEngagement['status'], readonly CollaborationEngagement['status'][]>> = {
  proposed: ['approved', 'cancelled'],
  approved: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function FacultyLifecycleWorkspace({
  engagement,
  events,
  lifecycle,
  canTransition,
  canRecordActivity,
  onChanged,
}: {
  readonly engagement: CollaborationEngagement;
  readonly events: readonly CollaborationEngagementEvent[];
  readonly lifecycle: ProductionFacultyLifecycle | null;
  readonly canTransition: boolean;
  readonly canRecordActivity: boolean;
  readonly onChanged: () => void;
}) {
  const activityKinds = useMemo<readonly Exclude<CollaborationEventKind, 'created' | 'status_transition'>[]>(() => (
    engagement.status === 'completed'
      ? ['outcome']
      : engagement.status === 'approved' || engagement.status === 'active'
        ? ['milestone', 'deliverable', 'feedback']
        : []
  ), [engagement.status]);
  const [kind, setKind] = useState<Exclude<CollaborationEventKind, 'created' | 'status_transition'>>(activityKinds[0] ?? 'milestone');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (activityKinds.length > 0 && !activityKinds.includes(kind)) setKind(activityKinds[0]);
  }, [activityKinds, kind]);

  const transition = async (toStatus: CollaborationEngagement['status']) => {
    if (!lifecycle) return;
    setPending(true);
    setError(undefined);
    try {
      await lifecycle.transition(engagement.id, toStatus);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update collaboration status.');
    } finally {
      setPending(false);
    }
  };

  const recordActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!lifecycle || !activityKinds.includes(kind)) return;
    setPending(true);
    setError(undefined);
    try {
      await lifecycle.recordActivity({
        collaborationEngagementId: engagement.id,
        kind,
        title,
        ...(detail.trim() ? { detail } : {}),
      });
      setTitle('');
      setDetail('');
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record collaboration activity.');
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-8 border-2 border-black bg-[#fff4c7] p-5 shadow-[5px_5px_0_#111]" aria-labelledby="faculty-lifecycle-title">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-[var(--accent-news)]">Append-only production lifecycle</p>
      <h2 id="faculty-lifecycle-title" className="mt-2 text-2xl font-black">Engagement milestones and outcomes</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">Every action is attributed to the authenticated actor and host organization. Status history and activity records are append-only; completed outcomes do not automatically mint evidence or claim causal impact.</p>
      {error ? <Notice>{error}</Notice> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-black">Lifecycle timeline</h3>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-black/60">No lifecycle events are visible.</p>
          ) : (
            <ol className="mt-3 grid gap-3">
              {[...events].reverse().map((item) => (
                <li key={item.id} className="border-2 border-black bg-white p-4">
                  <p className="font-mono-ui text-[10px] font-black uppercase">#{item.sequenceNumber} · {item.kind.replaceAll('_', ' ')}</p>
                  <p className="mt-2 text-sm font-bold">{item.title ?? (item.toStatus ? `${item.fromStatus ?? 'created'} → ${item.toStatus}` : 'Recorded activity')}</p>
                  {item.detail ? <p className="mt-2 text-sm leading-6 text-black/65">{item.detail}</p> : null}
                  <p className="mt-2 break-all font-mono-ui text-[10px] text-black/50">Actor {item.actorId} · host {item.organizationId}</p>
                  <p className="mt-1 font-mono-ui text-[10px] text-black/50">{new Date(item.occurredAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid content-start gap-5">
          <section className="border-2 border-black bg-white p-4">
            <h3 className="font-black">Human-controlled status</h3>
            <p className="mt-2 text-sm text-black/60">Current: <span className="font-black uppercase">{engagement.status}</span></p>
            {canTransition && nextStatuses[engagement.status].length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {nextStatuses[engagement.status].map((status) => (
                  <button key={status} type="button" disabled={pending || !lifecycle} onClick={() => void transition(status)} className="min-h-11 border-2 border-black bg-black px-4 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-50">
                    Move to {status}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-black/60">{canTransition ? 'No further status transition is available.' : 'Only an active host-organization faculty, institution-admin or industry-partner role may change status.'}</p>
            )}
          </section>

          {canRecordActivity && activityKinds.length > 0 ? (
            <form onSubmit={(event) => void recordActivity(event)} className="border-2 border-black bg-white p-4">
              <h3 className="font-black">Record scoped activity</h3>
              <label className="mt-4 grid gap-2 font-mono-ui text-[10px] font-black uppercase">Activity type
                <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case">
                  {activityKinds.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="mt-4 grid gap-2 font-mono-ui text-[10px] font-black uppercase">Title
                <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={1} maxLength={200} required className="min-h-11 border-2 border-black px-3 text-sm normal-case" />
              </label>
              <label className="mt-4 grid gap-2 font-mono-ui text-[10px] font-black uppercase">Detail (optional)
                <textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={4000} rows={4} className="border-2 border-black p-3 text-sm normal-case" />
              </label>
              <button type="submit" disabled={pending || !lifecycle || !title.trim()} className="mt-4 min-h-11 border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-50">Append activity</button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <article className="border-2 border-black bg-[#fff4c7] p-4">
      <p className="font-mono-ui text-[10px] font-black uppercase text-black/55">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

export type FacultyProductionPageModel = {
  readonly engagement?: CollaborationEngagement;
  readonly organizations: readonly Organization[];
  readonly visibleActors: readonly Actor[];
};
