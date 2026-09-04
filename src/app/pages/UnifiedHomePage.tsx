/**
 * UnifiedHomePage — The new CareerCase homepage.
 *
 * Communicates the complete product:
 * - original CareerCase Career Guidance (Engine A)
 * - SIH26044 Opportunity Readiness & Skills Intelligence (Engine B)
 * - Evidence → Opportunity → Outcome loop
 * - All four stakeholders: students, industry, faculty, institutions
 *
 * Design: preserves CareerCase editorial/newsprint identity
 * (cream, ink, red accent, stick figures, hard shadows)
 */

import { useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowRight, FileText, Target, Layers, Users,
  Building2, GraduationCap, BarChart2, CheckCircle2,
  AlertCircle, HelpCircle, ChevronRight, ExternalLink,
} from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { ScrollingTitles } from '../components/ScrollingTitles';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-ui text-[9.5px] uppercase tracking-[0.2em] text-[var(--accent-news)] mb-2">
      {children}
    </p>
  );
}

function SectionTitle({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={`font-[Playfair_Display] text-3xl md:text-4xl font-bold leading-tight text-[var(--ink)] ${className}`}>
      {children}
    </h2>
  );
}

function HardCard({ children, className = '', accent = false }: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border-2 border-black bg-[var(--paper-raised)] p-5 shadow-[4px_4px_0_#000] ${accent ? 'border-[var(--accent-news)] shadow-[4px_4px_0_var(--accent-news)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Evidence state indicator (mini Req↔Evidence row)
   ────────────────────────────────────────────────────────────────────────── */
function EvidenceRow({
  requirement,
  state,
  note,
}: {
  requirement: string;
  state: 'strong' | 'weak' | 'unknown' | 'gap';
  note: string;
}) {
  const stateConfig = {
    strong: { label: 'Strong evidence', color: 'text-black', bg: 'bg-black', icon: <CheckCircle2 size={12} /> },
    weak: { label: 'Weak evidence', color: 'text-black/60', bg: 'bg-black/20', icon: <AlertCircle size={12} /> },
    unknown: { label: 'Unknown', color: 'text-black/40', bg: 'bg-black/8', icon: <HelpCircle size={12} /> },
    gap: { label: 'Gap identified', color: 'text-[var(--accent-news)]', bg: 'bg-[var(--accent-news)]/10', icon: <AlertCircle size={12} /> },
  }[state];

  return (
    <div className="flex items-start gap-3 py-2 border-b border-black/6 last:border-b-0">
      <div className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 font-mono-ui text-[8px] uppercase tracking-[0.08em] ${stateConfig.color} ${stateConfig.bg} flex items-center gap-1`}>
        {stateConfig.icon}
        <span>{stateConfig.label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono-ui text-[10px] font-black text-[var(--ink)] truncate">{requirement}</p>
        <p className="font-[Inter] text-[11px] text-black/50 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Integration badge
   ────────────────────────────────────────────────────────────────────────── */
function IntegrationBadge({
  name,
  status,
}: {
  name: string;
  status: 'implemented' | 'prototype' | 'ready' | 'target';
}) {
  const config = {
    implemented: { label: 'Implemented', color: 'border-black text-black' },
    prototype: { label: 'Controlled Prototype', color: 'border-black/40 text-black/50' },
    ready: { label: 'Integration-Ready', color: 'border-black/40 text-black/50' },
    target: { label: 'Target Architecture', color: 'border-black/20 text-black/30' },
  }[status];

  return (
    <div className={`border px-3 py-1.5 ${config.color}`}>
      <p className="font-mono-ui text-[10px] font-black">{name}</p>
      <p className="font-mono-ui text-[8px] uppercase tracking-[0.08em] opacity-60">{config.label}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Homepage
   ────────────────────────────────────────────────────────────────────────── */

export function UnifiedHomePage() {
  const { user, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();

  const primaryCta = user ? '/opportunities' : '/auth?mode=signup';
  const primaryCtaLabel = user ? 'Open my CareerCase' : 'Build my Career Passport';
  const secondaryCta = '/how-it-works';

  return (
    <div className="min-h-screen bg-[var(--paper)]">

      {/* ── Fixed Ribbon ────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden pointer-events-none"
        aria-hidden="true"
        style={{ height: '34px' }}
      >
        <div
          className="flex items-center gap-8 font-mono-ui text-[9px] uppercase tracking-[0.18em] text-[var(--accent-news)] bg-[var(--accent-news)]/5 border-b border-[var(--accent-news)]/20 px-6"
          style={{ height: '34px', whiteSpace: 'nowrap' }}
        >
          <span>SIH26044 — Academia × Industry Collaboration Portal</span>
          <span aria-hidden>·</span>
          <span>Evidence-backed Opportunity Readiness</span>
          <span aria-hidden>·</span>
          <span>Career Guidance × Opportunity Readiness</span>
          <span aria-hidden>·</span>
          <span>UNKNOWN ≠ UNSKILLED</span>
          <span aria-hidden>·</span>
          <span>Deterministic · Explainable · Human-controlled decisions</span>
          <span aria-hidden>·</span>
          <span>SIH26044 — Academia × Industry Collaboration Portal</span>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative pt-14 pb-16 sm:pt-20 lg:pt-24 lg:pb-24 border-b-2 border-black overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <ScrollingTitles dimmed paused />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="font-mono-ui text-[9.5px] uppercase tracking-[0.22em] text-[var(--accent-news)] mb-4">
                CareerCase · Career Guidance × Opportunity Readiness
              </p>

              <h1
                id="hero-heading"
                className="font-[Playfair_Display] text-[clamp(2.35rem,5.2vw,4.5rem)] font-bold leading-[1.05] text-[var(--ink)]"
              >
                From evidence
                <br />
                <em className="not-italic text-[var(--accent-news)]">to opportunity.</em>
              </h1>

              <p className="mt-6 font-[Inter] text-base md:text-lg text-black/60 leading-relaxed max-w-lg">
                Build an evidence-backed Career Passport. Understand where you
                can go. See exactly what an opportunity requires, and know what
                you can prove — and what to do next.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(primaryCta)}
                  className="flex items-center gap-2 bg-black px-6 py-3.5 font-mono-ui text-[11px] font-black uppercase tracking-[0.1em] text-white hover:bg-black/85 transition-colors"
                >
                  {primaryCtaLabel}
                  <ArrowRight size={14} />
                </button>

                <Link
                  to={secondaryCta}
                  className="flex items-center gap-2 border-2 border-black px-6 py-3.5 font-mono-ui text-[11px] font-black uppercase tracking-[0.1em] text-black hover:bg-black/5 transition-colors"
                >
                  See how it works
                </Link>
              </div>

              {isSupabaseConfigured && (
                <p className="mt-5 font-mono-ui text-[9px] text-black/30 uppercase tracking-[0.1em]">
                  Returning user?{' '}
                  <Link to="/auth" className="underline underline-offset-2 hover:text-black transition-colors">
                    Sign in →
                  </Link>
                  {' '}For industry & institutions:{' '}
                  <Link to="/auth?mode=signup" className="underline underline-offset-2 hover:text-black transition-colors">
                    Apply for access →
                  </Link>
                </p>
              )}
            </motion.div>

            {/* Right: illustration */}
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              aria-hidden="true"
            >
              {/* Dossier/casefile visual */}
              <div className="relative">
                {/* Background decoration */}
                <div className="absolute -inset-8 opacity-5">
                  <div className="w-full h-full border-4 border-black rotate-3" />
                </div>

                {/* Main evidence casefile card */}
                <div className="relative border-2 border-black bg-white shadow-[8px_8px_0_#000] p-6 max-w-sm">
                  <div className="flex items-center gap-3 border-b-2 border-black pb-3 mb-4">
                    <div className="w-8 h-8 bg-black flex items-center justify-center">
                      <FileText size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/40">Casefile</p>
                      <p className="font-mono-ui text-[11px] font-black">Opportunity Readiness</p>
                    </div>
                    <div className="ml-auto font-mono-ui text-[9px] uppercase px-2 py-1 bg-black text-white">
                      NEAR READY
                    </div>
                  </div>

                  <EvidenceRow
                    requirement="Python / Structured Data"
                    state="strong"
                    note="Project artifact + assessment"
                  />
                  <EvidenceRow
                    requirement="Research Communication"
                    state="strong"
                    note="Presentation artifact"
                  />
                  <EvidenceRow
                    requirement="Data Visualization"
                    state="weak"
                    note="Self-declared only — add an artifact"
                  />
                  <EvidenceRow
                    requirement="Clinical Documentation"
                    state="unknown"
                    note="No evidence recorded yet"
                  />

                  <div className="mt-4 border-t border-black/10 pt-3">
                    <p className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-black/30">
                      UNKNOWN ≠ UNSKILLED
                    </p>
                    <p className="font-[Inter] text-[11px] text-black/50 mt-0.5">
                      Missing evidence is not an assumption of absence.
                    </p>
                  </div>
                </div>

                {/* Stick figure carrying the dossier */}
                <div className="absolute -right-8 bottom-0">
                  <StickFigure
                    pose="working"
                    size={80}
                    className="text-black opacity-70"
                  />
                </div>

                {/* Red annotation */}
                <div
                  className="absolute -top-4 -left-4 font-mono-ui text-[8px] uppercase tracking-[0.1em] text-[var(--accent-news)] border border-[var(--accent-news)] bg-[var(--paper)] px-2 py-1"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  Engine B · Opportunity Readiness
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── THE COMPLETE LOOP ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 border-b-2 border-black" aria-labelledby="loop-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-xl">
            <SectionKicker>The complete loop</SectionKicker>
            <SectionTitle id="loop-heading">
              CareerCase closes the whole chain.
            </SectionTitle>
            <p className="mt-4 font-[Inter] text-sm text-black/55 leading-relaxed">
              From building your Career Passport through verified evidence,
              to opportunity readiness, consented application, human
              recruitment, and institutional skills intelligence.
            </p>
          </div>

          {/* Loop steps */}
          <div className="mt-12 relative">
            {/* Connecting line (desktop) */}
            <div
              className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-black/10"
              aria-hidden="true"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-2">
              {[
                { step: '01', label: 'Career Passport', icon: <FileText size={18} />, desc: 'Skills, evidence, assessments' },
                { step: '02', label: 'Career Direction', icon: <Target size={18} />, desc: 'Engine A guidance (private)' },
                { step: '03', label: 'Opportunity', icon: <Layers size={18} />, desc: 'Discovery & requirements' },
                { step: '04', label: 'Readiness', icon: <BarChart2 size={18} />, desc: 'Engine B — Req↔Evidence' },
                { step: '05', label: 'Application', icon: <CheckCircle2 size={18} />, desc: 'Consented snapshot' },
                { step: '06', label: 'Intelligence', icon: <Building2 size={18} />, desc: 'Outcomes → institution action' },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  className="relative"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <div className="border-2 border-black bg-[var(--paper-raised)] p-4 shadow-[2px_2px_0_#000] h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono-ui text-[9px] text-black/30">{item.step}</span>
                      <div className="text-[var(--ink)]">{item.icon}</div>
                    </div>
                    <p className="font-mono-ui text-[10.5px] font-black uppercase tracking-[0.06em] leading-tight">
                      {item.label}
                    </p>
                    <p className="mt-1 font-[Inter] text-[11px] text-black/45 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  {i < 5 && (
                    <ChevronRight
                      size={12}
                      className="hidden lg:block absolute -right-4 top-8 text-black/20 z-10"
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ENGINE A — CAREER GUIDANCE ──────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black" aria-labelledby="engine-a-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionKicker>Engine A · Career Guidance (Private)</SectionKicker>
              <SectionTitle id="engine-a-heading">
                Before opportunity,
                <br />CareerCase understands you.
              </SectionTitle>
              <p className="mt-5 font-[Inter] text-sm text-black/55 leading-relaxed">
                The original CareerCase is preserved and enhanced. Build your
                Career Passport, complete RIASEC, aptitude, values, and
                aspirations assessments, and let CareerCase explain exactly
                why a career direction fits your evidence.
              </p>
              <p className="mt-3 font-[Inter] text-sm text-black/55 leading-relaxed">
                These assessments help <em>you</em> understand direction. They are not
                recruiter scores. Private guidance data never enters
                Opportunity Readiness or any recruiter projection.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 border-2 border-black px-5 py-3 font-mono-ui text-[10px] font-black uppercase tracking-[0.1em] hover:bg-black/5 transition-colors"
                >
                  Career Passport <ArrowRight size={12} />
                </Link>
                <Link
                  to="/assess"
                  className="flex items-center gap-2 border-2 border-black px-5 py-3 font-mono-ui text-[10px] font-black uppercase tracking-[0.1em] hover:bg-black/5 transition-colors"
                >
                  Assessments <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-3" aria-hidden="true">
              {[
                { pose: 'reading' as const, label: 'RIASEC interests' },
                { pose: 'thinking' as const, label: 'Aptitude baseline' },
                { pose: 'sitting' as const, label: 'Work values' },
                { pose: 'mapping' as const, label: 'Career Landscape' },
              ].map(({ pose, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <StickFigure pose={pose} size={56} className="text-black/60" />
                  <span className="font-mono-ui text-[8.5px] uppercase tracking-[0.1em] text-black/35">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── OPPORTUNITY READINESS (Engine B) ───────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black bg-[var(--ink)] text-white" aria-labelledby="engine-b-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="font-mono-ui text-[9.5px] uppercase tracking-[0.2em] text-[var(--accent-news)] mb-2">
                Engine B · Opportunity Readiness
              </p>
              <SectionTitle id="engine-b-heading" className="text-white">
                Readiness should show its work.
              </SectionTitle>
              <p className="mt-5 font-[Inter] text-sm text-white/60 leading-relaxed">
                For every opportunity, CareerCase produces an explainable
                readiness casefile showing what is strongly evidenced, what
                is weakly evidenced, and what is unknown.
              </p>
              <p className="mt-3 font-mono-ui text-[11px] text-[var(--accent-news)] font-black uppercase tracking-[0.08em]">
                UNKNOWN ≠ UNSKILLED
              </p>
              <p className="mt-2 font-[Inter] text-sm text-white/55 leading-relaxed">
                Missing evidence is not an assumption of absence. CareerCase
                invites you to prove what you already know before recommending
                you learn it.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  ['ELIGIBILITY', 'Hard gates evaluated first — transparently'],
                  ['REQUIRED COVERAGE', '4 of 5 required skills supported'],
                  ['EVIDENCE STATES', '3 strong · 1 weak · 1 unknown'],
                  ['READINESS BAND', 'NEAR_READY → close one gap'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline gap-3">
                    <span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-white/30 w-36 shrink-0">{label}</span>
                    <span className="font-[Inter] text-[12px] text-white/70">{value}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 font-mono-ui text-[10px] text-white/30 italic">
                "The AI didn't change its mind. The evidence changed."
              </p>
            </div>

            {/* Mini requirement matrix */}
            <div
              className="border-2 border-white/20 bg-white/5 p-5"
              aria-label="Example requirement to evidence matrix"
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <FileText size={14} className="text-white/50" />
                <span className="font-mono-ui text-[10px] uppercase tracking-[0.1em] text-white/50">
                  Requirement ↔ Evidence
                </span>
              </div>
              {[
                { req: 'Python / Scripting', state: 'MET_STRONG', evidence: 'GitHub project + assessment' },
                { req: 'Research Writing', state: 'MET_STRONG', evidence: 'Uploaded report artifact' },
                { req: 'Data Visualization', state: 'MET_WEAK_EVIDENCE', evidence: 'Self-declared only' },
                { req: 'Clinical Terminology', state: 'UNKNOWN', evidence: 'No evidence recorded' },
                { req: 'AYUSH Fundamentals', state: 'UNKNOWN', evidence: 'No evidence recorded' },
              ].map(({ req, state, evidence }) => {
                const stateColor = state === 'MET_STRONG'
                  ? 'text-white bg-white/20'
                  : state === 'MET_WEAK_EVIDENCE'
                  ? 'text-white/70 bg-white/10'
                  : 'text-white/30 bg-white/5';
                return (
                  <div key={req} className="flex items-start gap-3 py-2.5 border-b border-white/8 last:border-b-0">
                    <span className={`flex-shrink-0 font-mono-ui text-[8px] uppercase tracking-[0.06em] px-1.5 py-0.5 ${stateColor}`}>
                      {state === 'MET_STRONG' ? '✓ STRONG' : state === 'MET_WEAK_EVIDENCE' ? '⚠ WEAK' : '? UNKNOWN'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono-ui text-[10px] font-black text-white/80 truncate">{req}</p>
                      <p className="font-[Inter] text-[10px] text-white/35">{evidence}</p>
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <span className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-[var(--accent-news)]">NEAR_READY</span>
                <span className="font-[Inter] text-[11px] text-white/40">— one weak evidence item to resolve</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSE THIS GAP ──────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black" aria-labelledby="gap-closure-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-xl mb-10">
            <SectionKicker>Gap Closure</SectionKicker>
            <SectionTitle id="gap-closure-heading">
              Prove what you know.
              <br />Build what you don't.
            </SectionTitle>
            <p className="mt-4 font-[Inter] text-sm text-black/55 leading-relaxed">
              Before recommending you learn something, CareerCase first asks:
              do you already have evidence of this capability? Offer proof,
              request attestation, or take the shortest credible path to
              close the gap.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                action: 'PROVE',
                pose: 'presenting' as const,
                headline: 'You already know it.',
                body: 'Attach an artifact, project, or existing work sample. Let the evidence speak.',
                color: 'border-black',
              },
              {
                action: 'PRACTICE',
                pose: 'working' as const,
                headline: 'Demonstrate it.',
                body: 'Complete a controlled mini-project, challenge, or supervised assignment to generate proof.',
                color: 'border-black',
              },
              {
                action: 'LEARN',
                pose: 'reading' as const,
                headline: 'Build the knowledge.',
                body: 'Targeted courses, certification programs, or industry-published workshops.',
                color: 'border-black',
              },
              {
                action: 'EXPERIENCE',
                pose: 'climbing' as const,
                headline: 'Get the exposure.',
                body: 'Industry projects, mentorship, supervised work, or an internship that generates outcome evidence.',
                color: 'border-[var(--accent-news)]',
              },
            ].map(({ action, pose, headline, body, color }) => (
              <HardCard key={action} className={`border-2 ${color}`}>
                <div className="flex items-start gap-3 mb-3">
                  <StickFigure pose={pose} size={40} className="text-black/50 shrink-0" />
                  <p className="font-mono-ui text-[11px] font-black uppercase tracking-[0.1em] text-[var(--accent-news)] mt-1">
                    {action}
                  </p>
                </div>
                <p className="font-mono-ui text-[12px] font-black leading-tight mb-2">{headline}</p>
                <p className="font-[Inter] text-[11px] text-black/50 leading-relaxed">{body}</p>
              </HardCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUSTED APPLICATION ─────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black" aria-labelledby="application-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionKicker>Consented Application</SectionKicker>
              <SectionTitle id="application-heading">
                What the recruiter sees.
                <br />And what they don't.
              </SectionTitle>
              <p className="mt-5 font-[Inter] text-sm text-black/55 leading-relaxed">
                A recruiter never receives your raw Career Passport.
                CareerCase creates an explicit, consented, immutable
                application snapshot from an allowlist of
                opportunity-relevant data only.
              </p>
              <p className="mt-3 font-mono-ui text-[11px] text-[var(--accent-news)] font-black">
                CareerCase supports the decision. It never makes it.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4" aria-label="Application disclosure summary">
              <div className="border-2 border-black p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/40 mb-3">
                  Recruiter WILL receive
                </p>
                {[
                  'Opportunity-relevant skills',
                  'Selected evidence & provenance',
                  'Verification scope',
                  'Readiness casefile',
                  'Questionnaire result (if consented)',
                  'Eligibility summary',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 py-1.5 border-b border-black/5 last:border-b-0">
                    <CheckCircle2 size={11} className="text-black/40 shrink-0" />
                    <span className="font-[Inter] text-[11px] text-black/60">{item}</span>
                  </div>
                ))}
              </div>
              <div className="border-2 border-black/20 p-4">
                <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/30 mb-3">
                  Recruiter will NOT receive
                </p>
                {[
                  'RIASEC profile',
                  'Private work values',
                  'Private aspirations',
                  'Counselor conversation',
                  'Unrelated constraints',
                  'Any unlisted evidence',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 py-1.5 border-b border-black/5 last:border-b-0">
                    <span className="font-mono-ui text-[10px] text-black/20 shrink-0">✗</span>
                    <span className="font-[Inter] text-[11px] text-black/35">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUR STAKEHOLDERS ───────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black" aria-labelledby="stakeholders-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-lg mb-10">
            <SectionKicker>Academia × Industry ecosystem</SectionKicker>
            <SectionTitle id="stakeholders-heading">
              Four first-class stakeholders.
            </SectionTitle>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Users size={18} />,
                role: 'Students',
                pose: 'graduating' as const,
                desc: 'Build evidence, understand readiness, close gaps, apply with consent, track outcomes.',
                links: [['Career Passport', '/passport'], ['Opportunities', '/opportunities'], ['Applications', '/applications']],
              },
              {
                icon: <Building2 size={18} />,
                role: 'Industry',
                pose: 'pointing' as const,
                desc: 'Author opportunities, define requirements, review evidence, run human-decision recruitment.',
                links: [['Post Opportunity', '/auth?mode=signup'], ['Questionnaires', '/auth?mode=signup'], ['Skills Intelligence', '/auth?mode=signup']],
              },
              {
                icon: <GraduationCap size={18} />,
                role: 'Faculty',
                pose: 'presenting' as const,
                desc: 'Verify evidence, discover industrial training/FDPs, collaborate on research and mentorship.',
                links: [['Verification', '/verification'], ['Faculty Opportunities', '/faculty'], ['Collaborations', '/collaborations']],
              },
              {
                icon: <Building2 size={18} />,
                role: 'Institutions',
                pose: 'standing' as const,
                desc: 'Monitor cohort readiness, identify recurring gaps, launch interventions, track outcomes.',
                links: [['Skills Intelligence', '/institution/skills-intelligence'], ['Interventions', '/institution/interventions']],
              },
            ].map(({ icon, role, pose, desc, links }) => (
              <motion.div
                key={role}
                className="border-2 border-black p-5 shadow-[4px_4px_0_#000] bg-[var(--paper-raised)]"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 border-2 border-black flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="font-mono-ui text-[11px] font-black uppercase tracking-[0.08em]">{role}</p>
                    <StickFigure pose={pose} size={32} className="text-black/40 mt-1" />
                  </div>
                </div>
                <p className="font-[Inter] text-[11px] text-black/55 leading-relaxed mb-4">{desc}</p>
                <div className="space-y-1.5">
                  {links.map(([label, to]) => (
                    <Link
                      key={label}
                      to={to}
                      className="flex items-center gap-1.5 font-mono-ui text-[9.5px] uppercase tracking-[0.08em] text-black/50 hover:text-black transition-colors"
                    >
                      <ArrowRight size={9} />
                      {label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTITUTION INTELLIGENCE ────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black" aria-labelledby="intelligence-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Example intervention card */}
            <div
              className="border-2 border-black p-6 shadow-[4px_4px_0_#000]"
              aria-label="Example institution intervention signal"
            >
              <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/30 mb-4">
                SKILLS INTELLIGENCE · Intervention Signal
              </p>
              <div className="space-y-4">
                <div>
                  <p className="font-mono-ui text-[10px] text-black/40 uppercase tracking-[0.1em]">Signal</p>
                  <p className="font-[Inter] text-sm text-black/70 leading-relaxed mt-1">
                    Data visualization is a recurring evidence gap across analytics-focused opportunities.
                  </p>
                </div>
                <div>
                  <p className="font-mono-ui text-[10px] text-black/40 uppercase tracking-[0.1em]">Cohort</p>
                  <p className="font-[Inter] text-sm text-black/70">37 students targeting related roles</p>
                  <p className="font-mono-ui text-[9px] text-black/25 mt-0.5">Minimum threshold met · Suppressed below 5</p>
                </div>
                <div>
                  <p className="font-mono-ui text-[10px] text-black/40 uppercase tracking-[0.1em]">14 near-ready</p>
                  <p className="font-[Inter] text-sm text-black/70">
                    14 students are otherwise near-ready — one evidence gap from application.
                  </p>
                </div>
                <div className="border-t-2 border-black pt-4">
                  <p className="font-mono-ui text-[10px] text-[var(--accent-news)] uppercase tracking-[0.1em]">Recommended intervention</p>
                  <p className="font-[Inter] text-sm text-black/70 mt-1">
                    Launch a supervised visualization clinic + industry live project.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <SectionKicker>Institution Skills Intelligence</SectionKicker>
              <SectionTitle id="intelligence-heading">
                Cohort signals.
                <br />Concrete interventions.
              </SectionTitle>
              <p className="mt-5 font-[Inter] text-sm text-black/55 leading-relaxed">
                Institutions see which opportunity requirements repeatedly
                fail because of evidence gaps versus capability gaps, and
                receive actionable intervention recommendations — not
                retrospective placement statistics.
              </p>
              <p className="mt-3 font-[Inter] text-sm text-black/50 leading-relaxed">
                Every aggregate signal is source-labeled, time-windowed, and
                minimum-cohort suppressed. No individual surveillance.
              </p>
              <Link
                to="/institution/skills-intelligence"
                className="mt-6 flex items-center gap-2 border-2 border-black px-5 py-3 font-mono-ui text-[10px] font-black uppercase tracking-[0.1em] hover:bg-black/5 transition-colors w-fit"
              >
                Institution workspace <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ───────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b-2 border-black" aria-labelledby="integrations-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-xl mb-10">
            <SectionKicker>Existing ecosystem · Connected</SectionKicker>
            <SectionTitle id="integrations-heading">
              CareerCase adds the
              <br />readiness layer.
            </SectionTitle>
            <p className="mt-4 font-[Inter] text-sm text-black/55 leading-relaxed">
              CareerCase does not replace India's employment and skilling
              portals. It adds the evidence, readiness, and intervention layer
              that makes existing opportunities more trustworthy and actionable.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { name: 'NCS', status: 'target' as const },
              { name: 'Skill India Digital Hub', status: 'target' as const },
              { name: 'AICTE Internship Portal', status: 'target' as const },
              { name: 'NATS / NAPS', status: 'target' as const },
              { name: 'DigiLocker / NAD', status: 'target' as const },
              { name: 'APAAR / ABC', status: 'target' as const },
              { name: 'Institution SIS/ERP', status: 'ready' as const },
              { name: 'Employer ATS', status: 'ready' as const },
              { name: 'Learning Providers', status: 'prototype' as const },
            ].map(({ name, status }) => (
              <IntegrationBadge key={name} name={name} status={status} />
            ))}
          </div>

          <p className="mt-5 font-mono-ui text-[9px] text-black/25 uppercase tracking-[0.1em]">
            Integration statuses: Implemented · Controlled Prototype · Integration-Ready · Target Architecture ·
            No live government integration is claimed without authorization.
          </p>

          <Link
            to="/integration"
            className="mt-5 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-black/50 hover:text-black transition-colors w-fit"
          >
            View integration details <ExternalLink size={10} />
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24" aria-labelledby="final-cta-heading">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex justify-center gap-6 mb-8" aria-hidden="true">
            <StickFigure pose="waving" size={56} className="text-black/40" />
            <StickFigure pose="standing" size={56} className="text-black/50" />
            <StickFigure pose="celebrating" size={56} className="text-black/40" />
          </div>

          <SectionKicker>Get started</SectionKicker>
          <h2
            id="final-cta-heading"
            className="font-[Playfair_Display] text-4xl md:text-5xl font-bold text-[var(--ink)] mb-4"
          >
            Build evidence.
            <br />Understand readiness.
            <br />Make the next move.
          </h2>
          <p className="font-[Inter] text-sm text-black/50 max-w-md mx-auto mb-8">
            One product. Career Guidance × Opportunity Readiness.
            From evidence to opportunity — and back to institutional action.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(primaryCta)}
              className="flex items-center gap-2 bg-black px-7 py-4 font-mono-ui text-[11px] font-black uppercase tracking-[0.1em] text-white hover:bg-black/85 transition-colors"
            >
              {primaryCtaLabel}
              <ArrowRight size={14} />
            </button>
            <Link
              to="/demo"
              className="flex items-center gap-2 border-2 border-black px-7 py-4 font-mono-ui text-[11px] font-black uppercase tracking-[0.1em] text-black hover:bg-black/5 transition-colors"
            >
              Explore demo fallback
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
