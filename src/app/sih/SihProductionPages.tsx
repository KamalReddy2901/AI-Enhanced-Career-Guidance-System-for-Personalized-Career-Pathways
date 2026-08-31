/**
 * CareerWorkspacePage — Student career guidance hub (Engine A)
 *
 * The user's personal career guidance workspace. This is the bridge between
 * the Career Passport / Engine A guidance and the SIH26044 opportunity
 * readiness workspace.
 *
 * Private guidance data (Engine A personal assessment data) displayed here is
 * explicitly NOT shared with recruiters or used in Engine B scoring.
 */

import { Link } from 'react-router';
import {
  FileText, Target, Layers, BarChart2, MessageCircle,
  ArrowRight, ArrowUpRight, BookOpen, Map, Swords, ArrowLeftRight,
} from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useSihProduction } from './SihProductionContext';

function ActionCard({
  to,
  icon,
  title,
  body,
  badge,
  external = false,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
  external?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all duration-150"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 border-2 border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
          {icon}
        </div>
        {badge && (
          <span className="font-mono-ui text-[8px] uppercase tracking-[0.1em] border border-[var(--accent-news)] text-[var(--accent-news)] px-1.5 py-0.5">
            {badge}
          </span>
        )}
        {external && <ArrowUpRight size={12} className="text-black/30 group-hover:text-black transition-colors" />}
      </div>
      <div>
        <p className="font-mono-ui text-[11px] font-black uppercase tracking-[0.08em] mb-1">{title}</p>
        <p className="font-[Inter] text-[11px] text-black/50 leading-relaxed">{body}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 font-mono-ui text-[9px] uppercase tracking-[0.08em] text-black/30 group-hover:text-black transition-colors">
        Open <ArrowRight size={10} />
      </div>
    </Link>
  );
}

export function CareerWorkspacePage() {
  const { loading, error, actorId } = useSihProduction();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-2 flex items-start gap-4">
        <div aria-hidden="true">
          <StickFigure pose="reading" size={60} className="text-black/50" />
        </div>
        <div>
          <p className="font-mono-ui text-[9.5px] uppercase tracking-[0.18em] text-[var(--accent-news)]">
            Engine A · Career Guidance · Private
          </p>
          <h1 className="mt-1 font-[Playfair_Display] text-4xl font-bold leading-tight text-[var(--ink)]">
            My Career
          </h1>
          <p className="mt-2 max-w-2xl font-[Inter] text-sm leading-relaxed text-black/55">
            Your Career Passport and Career Direction are private guidance tools.
            These assessments and recommendations help you understand your direction.
            They are not shared with recruiters and never enter Opportunity Readiness scoring.
          </p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="my-6 border border-black/15 bg-black/2 px-4 py-3 flex items-center gap-3">
        <span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/30">
          Engine A — Private
        </span>
        <span className="font-[Inter] text-[11px] text-black/40">
          Personal assessments (interests, aptitude, values) and counselor history remain private to your Career Guidance workspace.
          They do not appear in recruiter projections.
        </span>
      </div>

      {/* Status handling */}
      {(loading || error || !actorId) ? null : null}

      {/* Core guidance cards */}
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          to="/passport"
          icon={<FileText size={16} />}
          title="Career Passport"
          body="Your evidence-backed profile: skills, experience, assessments, and qualifications."
          badge="Core"
        />
        <ActionCard
          to="/recommendations"
          icon={<Target size={16} />}
          title="Career Direction"
          body="Explore careers that match your evidence, and discover related opportunities."
        />
        <ActionCard
          to="/assess"
          icon={<Layers size={16} />}
          title="Assessments"
          body="Interests, aptitude, values, and aspirations screeners. Private guidance only — not recruiter scores."
        />
        <ActionCard
          to="/pathways"
          icon={<Map size={16} />}
          title="Career Pathways"
          body="Long-term routes for careers you are exploring. How do I become X?"
        />
        <ActionCard
          to="/counselor"
          icon={<MessageCircle size={16} />}
          title="AI Counselor"
          body="Explore directions, get explanations, and work through career decisions."
        />
        <ActionCard
          to="/opportunities"
          icon={<BarChart2 size={16} />}
          title="Discover Opportunities"
          body="Move from Career Direction to specific opportunities — with evidence-backed readiness."
          badge="New"
        />
      </div>

      {/* Additional tools */}
      <div className="mt-8">
        <p className="font-mono-ui text-[9px] uppercase tracking-[0.15em] text-black/25 mb-4">More career tools</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            to="/career-transition"
            icon={<ArrowLeftRight size={14} />}
            title="Career Transition"
            body="Explore switching between related career paths."
          />
          <ActionCard
            to="/compare"
            icon={<BookOpen size={14} />}
            title="Compare Careers"
            body="Side-by-side career comparison and gap analysis."
          />
          <ActionCard
            to="/roadmap"
            icon={<Map size={14} />}
            title="Career Roadmap"
            body="Visual timeline for long-term career progression."
          />
          <ActionCard
            to="/interview-prep"
            icon={<Swords size={14} />}
            title="Interview Prep"
            body="Practice and prepare for career-relevant interviews."
          />
        </div>
      </div>
    </div>
  );
}
