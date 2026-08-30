import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import type { Actor, CollaborationEngagement, Organization } from '../domain';
import { FacultyExplorer } from '../components/sih/faculty/FacultyExplorer';
import { FacultyCollaborationDetail } from '../components/sih/faculty/FacultyCollaborationDetail';
import {
  ProductionFacultyReads,
  type ProductionFacultyCollaborationBundle,
} from '../services/sih/productionFacultyReads';
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
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">{eyebrow}</p>
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

function useFacultyBundle() {
  const { actorId } = useSihProduction();
  const reads = useFacultyReads();
  const [bundle, setBundle] = useState<ProductionFacultyCollaborationBundle>({
    engagements: [],
    organizations: [],
    visibleActors: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

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
  }, [actorId, reads]);

  return { bundle, loading, error };
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
        This production surface is currently read-only. Interest, approval, milestones and outcome actions are not shown as persisted until their authoritative workflow is implemented.
      </Notice>
    </FacultyFrame>
  );
}

export function FacultyCollaborationDetailPage() {
  const { collaborationId } = useParams();
  const { bundle, loading, error } = useFacultyBundle();
  const engagement = collaborationId
    ? bundle.engagements.find((item) => item.id === collaborationId)
    : undefined;

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
      )}
    </FacultyFrame>
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
