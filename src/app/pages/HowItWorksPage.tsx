/**
 * HowItWorksPage — updated to cover the full unified CareerCase product.
 *
 * Explains both Engine A (Career Guidance) and Engine B (Opportunity Readiness),
 * the privacy model, evidence provenance, verification, and AI boundaries.
 * Preserves the editorial/newsprint identity.
 */

import { Link } from 'react-router';
import { StickFigure } from '../components/StickFigure';
import { KB_STATS } from '../data/knowledge';

const Section = ({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
    {kicker && (
      <p className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-[var(--accent-news)] mb-2">
        {kicker}
      </p>
    )}
    <h2 className="font-[Playfair_Display] text-2xl font-bold mb-3">{title}</h2>
    <div className="space-y-3 font-[Inter] text-[13px] text-black/65 leading-relaxed">
      {children}
    </div>
  </section>
);

const MonoBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="border-l-4 border-black bg-[var(--paper)] p-4 mt-3">
    <div className="font-mono-ui text-[10px] text-black/40 uppercase tracking-[0.1em] mb-1">Technical note</div>
    <p className="font-mono-ui text-[11px] text-black/60 leading-relaxed">{children}</p>
  </div>
);

export function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <header className="mb-10 flex items-start gap-5 border-y-4 border-double border-black py-8">
          <StickFigure pose="thinking" size={80} className="text-black/50 shrink-0" />
          <div>
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.2em] text-[var(--accent-news)] mb-2">
              CareerCase · Career Guidance × Opportunity Readiness
            </p>
            <h1 className="font-[Playfair_Display] text-4xl md:text-5xl font-bold leading-tight">
              How CareerCase works
            </h1>
            <p className="mt-3 font-[Inter] text-sm text-black/55 max-w-xl leading-relaxed">
              Two engines, one product. Engine A understands where you want to go.
              Engine B shows what you can prove for a specific opportunity —
              and what to do next.
            </p>
          </div>
        </header>

        <div className="space-y-5">

          {/* Engine A */}
          <Section kicker="Engine A · Career Guidance · Private" title="Career Guidance understands the person">
            <p>
              Engine A answers: <strong>which careers may be worth exploring for me?</strong> It
              uses eleven components — interests (RIASEC), aptitude, values, skills,
              transferable evidence, related experience, aspirations, indicative market signal,
              progression, learning feasibility and geography. Segment-specific weights sum to 100%.
            </p>
            <p>
              This engine is deterministic and versioned. "Why this career?" exposes
              every component score, weight, and missing-data note. No language model
              supplies a score.
            </p>
            <MonoBlock>
              Engine A result = Σ (component_score × segment_weight). For a career switcher,
              transferable fit carries 22%. A score of 80 contributes 17.6 points: 80 × 0.22.
              Missing data lowers confidence; it does not zero-out the component unless
              structural data is absent.
            </MonoBlock>
            <p className="font-mono-ui text-[10px] text-black/35 uppercase tracking-[0.08em]">
              RIASEC · aptitude · values · aspirations · engine-version · knowledge-base version · all recorded with result
            </p>
          </Section>

          {/* Engine B */}
          <Section kicker="Engine B · Opportunity Readiness · Separate" title="Opportunity Readiness shows what you can prove">
            <p>
              Engine B answers: <strong>for this exact opportunity, what requirements are met,
              what is unknown, and what can be improved before application?</strong>
            </p>
            <p>
              Engine B never imports RIASEC, personal values, private aspirations, or any
              Engine A preference dimension. Those never appear in recruiter projections.
            </p>
            <p>
              Every requirement is evaluated against evidence records with explicit provenance.
              The result is a vector of states — not a single percentage:
            </p>
            <ul className="list-none space-y-1 border-l-2 border-black/20 pl-4">
              {[
                ['MET_STRONG', 'Stated capability is well evidenced'],
                ['MET_WEAK_EVIDENCE', 'Claim appears to meet the requirement, but evidence is thin'],
                ['PARTIAL', 'Positive evidence exists but the requirement is not fully met'],
                ['UNKNOWN', 'CareerCase has no evidence — this is not an assumption of absence'],
                ['GAP', 'Recorded evidence positively indicates below the stated threshold'],
              ].map(([state, desc]) => (
                <li key={state} className="font-mono-ui text-[10px]">
                  <strong className="text-black">{state}</strong>
                  <span className="text-black/45"> — {desc}</span>
                </li>
              ))}
            </ul>
            <MonoBlock>
              Readiness band is derived deterministically from required requirement states only.
              UNKNOWN ≠ GAP. If CareerCase has no evidence of a skill, the state is UNKNOWN,
              not proficiency zero. The band (BUILDING_EVIDENCE → NEAR_READY → READY_FOR_REVIEW)
              reflects evidence completeness, not hiring probability.
            </MonoBlock>
          </Section>

          {/* Evidence model */}
          <Section kicker="Evidence & trust" title="Evidence shows its provenance">
            <p>
              Evidence has five provenance levels. Higher levels don't automatically
              override lower ones — each record retains its literal claim, observed date,
              scope, and source.
            </p>
            <div className="space-y-1.5 mt-2">
              {[
                ['Level 0 · Self-declared', 'Useful for discovery. Weak for consequential screening.'],
                ['Level 1 · Extracted/inferred', 'Resume line or activity suggests a skill. Source recorded.'],
                ['Level 2 · Assessed', 'Structured assessment observed a competency signal.'],
                ['Level 3 · Artifact-backed', 'GitHub, report, presentation, or project output.'],
                ['Level 4 · Human-attested', 'Faculty, mentor, or employer confirms a bounded contribution.'],
                ['Level 5 · Issuer-verified', 'Academic award verified through NAD/DigiLocker or equivalent.'],
              ].map(([level, desc]) => (
                <div key={level} className="flex gap-3 font-[Inter] text-[12px]">
                  <span className="font-mono-ui text-[9.5px] text-black/40 w-40 shrink-0 mt-0.5">{level}</span>
                  <span className="text-black/60">{desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-2">
              Repeated self-reports do not compound into stronger provenance. An extracted
              resume line remains extracted regardless of how many times it appears. Human
              attestation applies only to the explicitly scoped evidence it references.
            </p>
          </Section>

          {/* Verification */}
          <Section kicker="Verification" title="Verification is contextual and scoped">
            <p>
              A mentor or faculty verifier attests a bounded observed contribution —
              not universal mastery.
            </p>
            <p>
              <strong>Correct:</strong> "Observed Ananya independently build the visualization
              layer of Project X and explain the implementation."
            </p>
            <p>
              <strong>Not correct:</strong> "Ananya is globally verified as an expert in
              data visualization."
            </p>
            <p>
              Every verification event is append-only. Attestation can be disputed or
              revoked, creating a new event without erasing history. After attestation,
              only the causally affected readiness components change — nothing else.
            </p>
          </Section>

          {/* AI boundary */}
          <Section kicker="AI boundary" title="What AI does — and does not do">
            <p>
              AI assists with extraction and explanation. It does not supply scores, bands,
              eligibility results, or shortlist decisions.
            </p>
            <ul className="space-y-1 font-[Inter] text-[12px]">
              {[
                ['AI assists with', 'Resume evidence extraction, opportunity structuring, skill-synonym suggestions, natural-language explanation of deterministic results, multilingual assistance, interview preparation, career counseling, feedback summarization.'],
                ['AI may NOT silently decide', 'Opportunity readiness band, eligibility, shortlist, rejection, candidate rank, or any high-stakes application decision.'],
                ['Engine A nuance', 'AI may propose structured aptitude evidence items. The user confirms them; a deterministic function converts confirmed evidence into a small capped, disclosed adjustment. No model completion is consumed directly as a score.'],
                ['Fallback behavior', 'If the AI proxy is unavailable: readiness calculates, matrix renders, gap closure works, application works, mentor verification works, institution analytics work. The golden demo path does not depend on model uptime.'],
              ].map(([label, desc]) => (
                <li key={label}>
                  <span className="font-mono-ui text-[9.5px] font-black uppercase tracking-[0.08em] text-black">{label}: </span>
                  <span className="text-black/60">{desc}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Application privacy */}
          <Section kicker="Application & privacy" title="Recruiter payload is an explicit allowlist">
            <p>
              A recruiter never receives the raw Career Passport. An immutable,
              versioned application snapshot is created from an explicit allowlist:
              opportunity-relevant evidence, eligibility, readiness vector, and
              questionnaire result where consented.
            </p>
            <p>
              The following never enter a recruiter projection: RIASEC, private
              work values, private aspirations, counselor history, financial
              constraints, unrelated personal information.
            </p>
            <p>
              Later Passport edits do not silently rewrite prior application snapshots.
              Each snapshot is bound to exact opportunity version, evidence versions, and
              policy version at time of submission.
            </p>
          </Section>

          {/* Skills and KB */}
          <Section kicker="Knowledge base" title="Grounded in NCO-2015 and NSQF">
            <p>
              The knowledge base uses curated NCO-2015 occupational identifiers and
              NSQF-aligned qualification metadata. Market signals are curated indicative
              snapshots — not live government statistics.
            </p>
            <p className="font-mono-ui text-[10px] text-black/35 uppercase tracking-[0.08em]">
              Current release · {KB_STATS.occupations} occupations · {KB_STATS.skills} skills ·
              {KB_STATS.transitions} transitions · {KB_STATS.qualifications} qualifications
            </p>
            <p>
              Skill resolution in Engine B is conservative: exact canonical names or
              reviewed aliases only. Fuzzy/shared-token guesses are never silently promoted
              to a met requirement state.
            </p>
          </Section>

          {/* Fairness */}
          <Section kicker="Fairness & limits" title="Deterministic is auditable — not automatically unbiased">
            <p>
              Deterministic scoring makes policy inspectable, but fairness still requires
              review of requirements, weights, proxies, source data, and outcomes. We keep
              humans in control of every consequential hiring decision and plan subgroup audits.
            </p>
            <p>
              CareerCase does not claim psychometric validation, live national market
              intelligence, or placement probability. Assessments are exploratory product
              screeners. Readiness describes evidence completeness — it does not predict hiring.
            </p>
            <p>
              No demographic or protected-characteristic input is ever used for candidate
              ranking. Location is used only when genuinely required by the opportunity.
            </p>
          </Section>

        </div>

        {/* Navigation */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/passport"
            className="min-h-11 border-2 border-black px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.08em] hover:bg-black/5 transition-colors"
          >
            Career Passport
          </Link>
          <Link
            to="/opportunities"
            className="min-h-11 bg-black px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-white hover:bg-black/85 transition-colors"
          >
            Discover opportunities
          </Link>
          <Link
            to="/about"
            className="min-h-11 border-2 border-black/20 px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-black/50 hover:border-black hover:text-black transition-colors"
          >
            About CareerCase
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksPage;
