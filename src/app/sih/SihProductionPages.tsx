import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "../services/supabase";
import { useSihProduction } from "./SihProductionContext";

type Row = Record<string, unknown>;
const safe = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "—";

function Frame({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children?: React.ReactNode;
}) {
  const { loading, error, actorId } = useSihProduction();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
        {description}
      </p>
      {loading ? (
        <Notice>Loading authenticated authority…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : !actorId ? (
        <Notice>
          Sign in with a provisioned CareerCase role to use this production
          workspace.
        </Notice>
      ) : (
        <div className="mt-8">{children}</div>
      )}
    </div>
  );
}

function Notice({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="mt-8 border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">
      {children}
    </div>
  );
}

function useRows(table: string, select = "*", order?: string) {
  const { actorId } = useSihProduction();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!actorId || !supabase) return;
    let active = true;
    let query = supabase
      .schema("sih26044")
      .from(table)
      .select(select)
      .limit(100);
    if (order) query = query.order(order, { ascending: false });
    void query.then(({ data, error: reason }) => {
      if (!active) return;
      if (reason) setError(reason.message);
      else setRows((data ?? []) as unknown as Row[]);
    });
    return () => {
      active = false;
    };
  }, [actorId, order, select, table]);
  return { rows, error };
}

function Cards({
  rows,
  empty,
  fields,
  href,
}: {
  readonly rows: Row[];
  readonly empty: string;
  readonly fields: readonly [string, string][];
  readonly href?: (row: Row) => string;
}) {
  if (!rows.length) return <Notice>{empty}</Notice>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((row, index) => {
        const body = (
          <>
            <h2 className="text-lg font-black">{safe(row[fields[0][0]])}</h2>
            <dl className="mt-3 grid gap-2 text-xs">
              {fields.slice(1).map(([key, label]) => (
                <div key={key}>
                  <dt className="font-mono-ui uppercase text-black/45">
                    {label}
                  </dt>
                  <dd className="mt-1">{safe(row[key])}</dd>
                </div>
              ))}
            </dl>
          </>
        );
        return href ? (
          <Link
            key={safe(row.id) + index}
            to={href(row)}
            className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111] hover:-translate-y-0.5"
          >
            {body}
          </Link>
        ) : (
          <article
            key={safe(row.id) + index}
            className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]"
          >
            {body}
          </article>
        );
      })}
    </div>
  );
}

export function CareerWorkspacePage() {
  return (
    <Frame
      eyebrow="Engine A · private guidance"
      title="Career"
      description="Career Passport and Career Direction remain the private guidance engine. These inputs are structurally outside recruiter projections."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          className="border-2 border-black bg-white p-5 font-black shadow-[4px_4px_0_#111]"
          to="/passport"
        >
          Career Passport →
        </Link>
        <Link
          className="border-2 border-black bg-white p-5 font-black shadow-[4px_4px_0_#111]"
          to="/recommendations"
        >
          Career Direction →
        </Link>
      </div>
    </Frame>
  );
}

export function OpportunitiesPage() {
  const { rows, error } = useRows(
    "opportunity_versions",
    "id,opportunity_id,title,opportunity_type,status,published_at,closes_at",
    "published_at",
  );
  return (
    <Frame
      eyebrow="Engine B · opportunity readiness"
      title="Opportunities"
      description="Published, versioned opportunities. Readiness explains requirement-level evidence; it is never hiring probability."
    >
      {error && <Notice>{error}</Notice>}
      <Cards
        rows={rows.filter((r) => r.status === "published")}
        empty="No published production opportunities are available yet."
        fields={[
          ["title", "Title"],
          ["opportunity_type", "Type"],
          ["closes_at", "Closes"],
        ]}
        href={(row) => `/opportunities/${safe(row.id)}`}
      />
    </Frame>
  );
}

export function OpportunityDetailPage() {
  const { opportunityVersionId } = useParams();
  const { rows } = useRows(
    "opportunity_requirements",
    "id,opportunity_version_id,literal_source_wording,priority,evidence_expectation,resolution_status,canonical_skill_label",
  );
  const matching = rows.filter(
    (r) => r.opportunity_version_id === opportunityVersionId,
  );
  return (
    <Frame
      eyebrow="Immutable opportunity version"
      title="Requirements and readiness"
      description="Literal employer wording is preserved. UNKNOWN means insufficient evidence or clarification—not unskilled."
    >
      <Cards
        rows={matching}
        empty="Requirements are unavailable or this version is not visible to your role."
        fields={[
          ["literal_source_wording", "Requirement"],
          ["priority", "Priority"],
          ["evidence_expectation", "Evidence"],
          ["resolution_status", "Resolution"],
        ]}
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={`/opportunities/${opportunityVersionId}/readiness`}
          className="bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white"
        >
          Explain my readiness
        </Link>
        <Link
          to="/evidence"
          className="border-2 border-black px-5 py-3 font-mono-ui text-xs font-black uppercase"
        >
          Prove or clarify
        </Link>
      </div>
    </Frame>
  );
}

export function ReadinessPage() {
  const { rows, error } = useRows(
    "opportunity_readiness_results",
    "id,opportunity_version_id,readiness_band,engine_version,evidence_policy_version,generated_at",
    "generated_at",
  );
  return (
    <Frame
      eyebrow="Deterministic · explainable · versioned"
      title="Opportunity Readiness"
      description="Readiness is an auditable evidence comparison, not candidate ranking or a hiring decision."
    >
      {error && <Notice>{error}</Notice>}
      <Cards
        rows={rows}
        empty="No canonical readiness result exists yet. Add or clarify evidence, then run the trusted readiness service."
        fields={[
          ["readiness_band", "Band"],
          ["engine_version", "Engine version"],
          ["evidence_policy_version", "Evidence policy"],
          ["generated_at", "Computed"],
        ]}
      />
      <div className="mt-6">
        <Link
          to="/gap-closure"
          className="bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white"
        >
          Open gap closure
        </Link>
      </div>
    </Frame>
  );
}

export function EvidencePage() {
  const { actorId, dal } = useSihProduction();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (actorId && dal)
      void dal
        .listEvidenceForSubject(actorId)
        .then((data) => setRows(data as unknown as Row[]));
  }, [actorId, dal]);
  return (
    <Frame
      eyebrow="Career Passport evidence"
      title="Evidence"
      description="Provenance stays explicit. Self-reported evidence never becomes issuer-grade merely through repetition or scoring."
    >
      <Cards
        rows={rows}
        empty="No production evidence records yet."
        fields={[
          ["literalClaim", "Claim"],
          ["provenance", "Provenance"],
          ["initialVerificationState", "Verification"],
          ["visibility", "Visibility"],
        ]}
      />
      <div className="mt-6">
        <Link
          to="/verification"
          className="border-2 border-black px-5 py-3 font-mono-ui text-xs font-black uppercase"
        >
          Verification workspace
        </Link>
      </div>
    </Frame>
  );
}

export function ApplicationsPage() {
  const { actorId, dal } = useSihProduction();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (actorId && dal)
      void dal
        .listApplicationsForApplicant(actorId)
        .then((data) => setRows(data as unknown as Row[]));
  }, [actorId, dal]);
  return (
    <Frame
      eyebrow="Purpose-specific consent"
      title="Applications"
      description="Every submission is bound to the exact immutable snapshot supplied at submission time."
    >
      <Cards
        rows={rows}
        empty="No production applications yet."
        fields={[
          ["id", "Application"],
          ["currentStage", "Stage"],
          ["opportunityVersionId", "Opportunity version"],
          ["createdAt", "Created"],
        ]}
      />
    </Frame>
  );
}

export function GapClosurePage() {
  return (
    <Frame
      eyebrow="UNKNOWN ≠ UNSKILLED"
      title="Gap Closure"
      description="Choose the right response per requirement: Prove or clarify first for unknowns; Practice, Learn, or Experience where evidence shows a real capability gap."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Prove / clarify", "Practice", "Learn", "Experience"].map((x) => (
          <article
            key={x}
            className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]"
          >
            <h2 className="font-black">{x}</h2>
          </article>
        ))}
      </div>
    </Frame>
  );
}

export function IndustryPage() {
  const { rows, error } = useRows(
    "opportunity_versions",
    "id,title,status,version_number,published_at",
    "published_at",
  );
  return (
    <Frame
      eyebrow="Industry workspace"
      title="Opportunity Management"
      description="Author, review and human-confirm requirements before publishing an immutable version. Review-only suggestions never become resolved automatically."
    >
      {error && <Notice>{error}</Notice>}
      <Cards
        rows={rows}
        empty="No opportunities are visible for your authorized organizations."
        fields={[
          ["title", "Title"],
          ["status", "Status"],
          ["version_number", "Version"],
          ["published_at", "Published"],
        ]}
      />
    </Frame>
  );
}
export function ApplicantsPage() {
  const { rows, error } = useRows(
    "applications",
    "id,opportunity_id,opportunity_version_id,initial_stage,created_at",
    "created_at",
  );
  return (
    <Frame
      eyebrow="Human recruitment"
      title="Applicants"
      description="Administrative sorting only. Screening, interview, shortlist, offer and rejection remain attributable human decisions over purpose-limited projections."
    >
      {error && <Notice>{error}</Notice>}
      <Cards
        rows={rows}
        empty="No consented applications are visible to your recruiter authority."
        fields={[
          ["id", "Application"],
          ["initial_stage", "Initial stage"],
          ["opportunity_version_id", "Version"],
          ["created_at", "Received"],
        ]}
      />
    </Frame>
  );
}

export function FacultyPage() {
  const { rows, error } = useRows(
    "collaboration_engagements",
    "id,kind,status,starts_at,ends_at",
    "created_at",
  );
  return (
    <Frame
      eyebrow="Faculty · first-class lifecycle"
      title="Faculty–Industry Collaboration"
      description="Faculty internships, training, FDPs, consultancy, research, mentorship, workshops, guest lectures and live projects remain outcome-tracked engagements."
    >
      {error && <Notice>{error}</Notice>}
      <Cards
        rows={rows}
        empty="No faculty engagements are visible for your organizations."
        fields={[
          ["kind", "Engagement type"],
          ["status", "Status"],
          ["starts_at", "Starts"],
          ["ends_at", "Ends"],
        ]}
      />
    </Frame>
  );
}

export function InstitutionPage() {
  const applications = useRows("applications", "id,created_at", "created_at");
  const outcomes = useRows(
    "outcome_events",
    "id,kind,occurred_at",
    "occurred_at",
  );
  const engagements = useRows(
    "collaboration_engagements",
    "id,status",
    "created_at",
  );
  return (
    <Frame
      eyebrow="Privacy-protected aggregate intelligence"
      title="Institution Skills Intelligence"
      description="Descriptive distributions and funnels support interventions. Small cohorts are suppressed and no causal effect is implied."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Visible applications" value={applications.rows.length} />
        <Metric label="Visible outcomes" value={outcomes.rows.length} />
        <Metric label="Faculty engagements" value={engagements.rows.length} />
      </div>
      <Notice>
        Production analytics expose only authorized aggregate views. Individual
        guidance traits are not an analytics dimension.
      </Notice>
    </Frame>
  );
}
function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
      <p className="font-mono-ui text-[10px] font-black uppercase">{label}</p>
      <p className="mt-2 text-4xl font-black">
        {value < 5 ? "Suppressed" : value}
      </p>
      <p className="mt-2 text-xs text-black/55">Minimum cohort threshold: 5</p>
    </article>
  );
}
