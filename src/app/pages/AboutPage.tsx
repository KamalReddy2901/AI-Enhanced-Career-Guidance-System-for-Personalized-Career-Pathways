import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck, Brain, Database, Lock, Code, Users, Target, Zap } from 'lucide-react';
import { NCOBadge } from '../components/NCOBadge';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';
import { useT } from '../i18n';

export function AboutPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-[var(--paper)] px-6 py-16 pb-24 md:py-24">
      <GuidanceEntrance className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12 border-b-2 border-[var(--ink)] pb-8">
          <div className="flex items-center gap-3 mb-4">
            <NCOBadge variant="default" />
          </div>
          <h1 className="font-display text-6xl leading-[1.05] tracking-tighter mb-4">
            <TextReveal text="About CareerCase" />
          </h1>
          <p className="text-xl text-[var(--ink-soft)] leading-relaxed">
            Evidence-based career guidance powered by India's National Classification of Occupations (NCO-2015) and National Skills Qualifications Framework (NSQF).
          </p>
        </header>

        {/* What is CareerCase */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <Target size={28} />
            What is CareerCase?
          </h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-[var(--ink-soft)] leading-relaxed mb-4">
              CareerCase is a deterministic, evidence-based career guidance system designed for India's workforce. Unlike AI chatbots that generate vague suggestions, we use a structured knowledge base of 100+ NCO-2015 coded occupations, each mapped to specific skills, qualifications, and career pathways.
            </p>
            <p className="text-[var(--ink-soft)] leading-relaxed mb-4">
              Our system creates a "Career Passport" for each user—a living document that captures your interests, aptitudes, values, skills, and aspirations. This passport becomes the foundation for personalized career recommendations and pathway planning.
            </p>
            <p className="text-[var(--ink-soft)] leading-relaxed">
              CareerCase is built to complement government initiatives like the Skill India Digital Hub (SIDH), National Career Service (NCS), and Pradhan Mantri Kaushal Vikas Yojana (PMKVY).
            </p>
          </div>
        </section>

        {/* Our Approach */}
        <section className="mb-12 bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-8">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Brain size={28} />
            Our Approach: Deterministic vs. LLM
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-3 text-[var(--accent-news)]">
                ✓ What We Do (Deterministic)
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span>→</span>
                  <span>Score careers using versioned, transparent algorithms</span>
                </li>
                <li className="flex gap-2">
                  <span>→</span>
                  <span>Map skills to real NCO occupation codes</span>
                </li>
                <li className="flex gap-2">
                  <span>→</span>
                  <span>Build pathways from curated qualification data</span>
                </li>
                <li className="flex gap-2">
                  <span>→</span>
                  <span>Show exactly why each score was computed</span>
                </li>
                <li className="flex gap-2">
                  <span>→</span>
                  <span>Provide evidence trails for every recommendation</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-3 text-[var(--ink-soft)]">
                ✗ What We Don't Do (Pure LLM)
              </h3>
              <ul className="space-y-2 text-sm text-[var(--ink-soft)]">
                <li className="flex gap-2">
                  <span>✗</span>
                  <span>Generate career matches from hallucinated patterns</span>
                </li>
                <li className="flex gap-2">
                  <span>✗</span>
                  <span>Give advice without citing the knowledge base</span>
                </li>
                <li className="flex gap-2">
                  <span>✗</span>
                  <span>Change scoring logic based on vibes</span>
                </li>
                <li className="flex gap-2">
                  <span>✗</span>
                  <span>Hide how recommendations are calculated</span>
                </li>
                <li className="flex gap-2">
                  <span>✗</span>
                  <span>Mix unverified data into core matching</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-[var(--paper)] border-l-4 border-[var(--accent-news)]">
            <p className="text-sm text-[var(--ink-soft)]">
              <strong>Note:</strong> We do use AI (Groq Llama models) for generating career dossiers, job descriptions, market insights, and conversational guidance—but never for core scoring or matching. The deterministic engine remains transparent and auditable.
            </p>
          </div>
        </section>

        {/* Evidence-Based Methodology */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <Database size={28} />
            Evidence-Based Methodology
          </h2>
          <div className="space-y-6">
            <div className="border-l-4 border-[var(--ink)] pl-6">
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">
                1. Multi-Dimensional Profiling
              </h3>
              <p className="text-sm text-[var(--ink-soft)]">
                We assess users across 11 fit dimensions: Interest (RIASEC), Aptitude, Values, Skills, Transferable Skills, Experience, Aspirations, Market Demand, Career Progression, Learning Feasibility, and Geographic Fit. Each dimension contributes to the final recommendation score based on evidence-backed weights.
              </p>
            </div>
            <div className="border-l-4 border-[var(--ink)] pl-6">
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">
                2. Skill-Gap Analysis
              </h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Every career recommendation includes a detailed gap report showing which skills you have, which you need, and the severity of each gap. The Skill Gap Index (SGI) and Readiness score help you understand how prepared you are for a transition.
              </p>
            </div>
            <div className="border-l-4 border-[var(--ink)] pl-6">
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">
                3. Multi-Route Pathways
              </h3>
              <p className="text-sm text-[var(--ink-soft)]">
                We don't believe in one-size-fits-all. Each career pathway offers three routes: Focused (skill-and-evidence based), Lower-Risk (stepping-stone role), and Credential Route (formal qualification). Compare their actual time and trade-offs against your constraints.
              </p>
            </div>
            <div className="border-l-4 border-[var(--ink)] pl-6">
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">
                4. Recognition of Prior Learning (RPL)
              </h3>
              <p className="text-sm text-[var(--ink-soft)]">
                If you have transferable skills from past experience, we highlight them explicitly. You can validate these skills through NSQF-aligned RPL processes and reduce your learning time.
              </p>
            </div>
          </div>
        </section>

        {/* NCO/NSQF Grounding */}
        <section className="mb-12 bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-8">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <ShieldCheck size={28} />
            NCO-2015/NSQF Grounding
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">NCO-2015 (National Classification of Occupations)</h3>
              <p className="text-sm text-[var(--ink-soft)] mb-3">
                Every occupation in CareerCase is mapped to an official NCO-2015 code. This ensures our recommendations align with India's labour market structure and can integrate with government systems like NCS and SIDH.
              </p>
              <p className="font-mono-ui text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Coverage: 100+ NCO codes spanning all major sectors
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">NSQF (National Skills Qualifications Framework)</h3>
              <p className="text-sm text-[var(--ink-soft)] mb-3">
                Each occupation and qualification is tagged with an NSQF level (1-10), indicating the complexity and entry requirements. This helps you understand progression paths and qualification equivalencies.
              </p>
              <p className="font-mono-ui text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                Integration: NSQF-aligned pathways with multi-entry/exit points
              </p>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-4">Data Sources & Freshness</h2>
          <div className="space-y-4">
            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Occupation Knowledge Base</h3>
                  <p className="text-sm text-[var(--ink-soft)]">
                    Curated from NCO-2015, NSDC sector reports, and industry skill councils
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase text-[var(--accent-news)]">
                  KB v2026.06.1
                </span>
              </div>
            </div>
            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Skills Taxonomy</h3>
                  <p className="text-sm text-[var(--ink-soft)]">
                    Based on NSQF Qualification Packs and O*NET skill descriptors
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)]">
                  800+ skills
                </span>
              </div>
            </div>
            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Market Signals</h3>
                  <p className="text-sm text-[var(--ink-soft)]">
                    Indicative demand data refreshed via AI analysis of job trends (with timestamp)
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)]">
                  Dynamic
                </span>
              </div>
            </div>
            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Qualifications Catalog</h3>
                  <p className="text-sm text-[var(--ink-soft)]">
                    NSDC-approved courses, ITI programs, university degrees, and apprenticeships
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase text-[var(--ink-soft)]">
                  300+ programs
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-12 bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-8">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <Lock size={28} />
            Privacy & Transparency
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Your Data, Your Control</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                All profile data (assessments, skills, experiences) is stored encrypted in your account. You can export, delete, or modify it at any time. We comply with India's Digital Personal Data Protection (DPDP) Act, 2023.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Transparent Scoring</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Every recommendation score comes with a detailed breakdown. Click "Why this?" on any career card to see exactly how the score was computed, which dimensions contributed most, and what evidence was used.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">No Vendor Lock-In</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                CareerCase is designed for interoperability. Your Career Passport can be exported as JSON and used with other systems. We're built to complement, not replace, existing platforms like SIDH and NCS.
              </p>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <Code size={28} />
            Technology Stack
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-[var(--ink-faint)] p-4">
              <h3 className="font-mono-ui text-xs uppercase tracking-wide mb-2">Frontend</h3>
              <p className="text-sm text-[var(--ink-soft)]">React, TypeScript, Vite, Framer Motion</p>
            </div>
            <div className="border border-[var(--ink-faint)] p-4">
              <h3 className="font-mono-ui text-xs uppercase tracking-wide mb-2">Backend</h3>
              <p className="text-sm text-[var(--ink-soft)]">Supabase (PostgreSQL, Auth, Storage)</p>
            </div>
            <div className="border border-[var(--ink-faint)] p-4">
              <h3 className="font-mono-ui text-xs uppercase tracking-wide mb-2">AI Layer</h3>
              <p className="text-sm text-[var(--ink-soft)]">Groq (Llama 3.3 70B) via Cloudflare Worker proxy</p>
            </div>
            <div className="border border-[var(--ink-faint)] p-4">
              <h3 className="font-mono-ui text-xs uppercase tracking-wide mb-2">Knowledge Base</h3>
              <p className="text-sm text-[var(--ink-soft)]">Versioned TypeScript modules with type safety</p>
            </div>
            <div className="border border-[var(--ink-faint)] p-4">
              <h3 className="font-mono-ui text-xs uppercase tracking-wide mb-2">Hosting</h3>
              <p className="text-sm text-[var(--ink-soft)]">Vercel (frontend), Cloudflare (AI proxy)</p>
            </div>
            <div className="border border-[var(--ink-faint)] p-4">
              <h3 className="font-mono-ui text-xs uppercase tracking-wide mb-2">Testing</h3>
              <p className="text-sm text-[var(--ink-soft)]">Vitest, React Testing Library</p>
            </div>
          </div>
        </section>

        {/* How Scoring Works */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <Zap size={28} />
            How Scoring Works
          </h2>
          <div className="bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">The Formula</h3>
                <code className="block bg-[var(--paper)] border border-[var(--ink-faint)] p-3 text-xs font-mono overflow-x-auto">
                  TotalScore = Σ (DimensionScore × SegmentWeight) for all 11 dimensions
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Segment Weights</h3>
                <p className="text-sm text-[var(--ink-soft)] mb-3">
                  Weights vary by user segment (school student, college student, job seeker, career switcher, professional). For example, school students get higher weight on interests and aptitudes, while professionals get higher weight on experience and skills.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Confidence Adjustments</h3>
                <p className="text-sm text-[var(--ink-soft)] mb-3">
                  Each score is tagged with confidence (high/medium/low) based on profile completeness and evidence quality. Low-confidence scores come with explicit warnings and suggestions to complete missing assessments.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Explainability</h3>
                <p className="text-sm text-[var(--ink-soft)]">
                  Every component score includes a "Why?" button that shows the calculation method, evidence sources, and reasoning. This ensures you understand not just what the score is, but why it is that way.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Readiness */}
        <section className="mb-12 bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-8">
          <h2 className="font-display text-3xl mb-4 flex items-center gap-3">
            <Users size={28} />
            Government Integration Readiness
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 border border-[var(--ink-faint)]">
              <div className="font-mono-ui text-xs uppercase tracking-wide mb-2 text-[var(--accent-news)]">
                ✓ SIDH Compatible
              </div>
              <p className="text-sm text-[var(--ink-soft)]">NCO-aligned data model</p>
            </div>
            <div className="text-center p-4 border border-[var(--ink-faint)]">
              <div className="font-mono-ui text-xs uppercase tracking-wide mb-2 text-[var(--accent-news)]">
                ✓ NCS Ready
              </div>
              <p className="text-sm text-[var(--ink-soft)]">Occupation code mapping</p>
            </div>
            <div className="text-center p-4 border border-[var(--ink-faint)]">
              <div className="font-mono-ui text-xs uppercase tracking-wide mb-2 text-[var(--accent-news)]">
                ✓ PMKVY Aligned
              </div>
              <p className="text-sm text-[var(--ink-soft)]">NSQF-based pathways</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">API Integration Potential</h3>
            <p className="text-sm text-[var(--ink-soft)] mb-3">
              CareerCase exposes RESTful APIs for recommendations, pathway planning, and skill-gap analysis. These can be consumed by government portals, educational institutions, or skill development centers.
            </p>
            <Link 
              to="/help" 
              className="inline-block text-sm underline hover:no-underline"
            >
              View API documentation →
            </Link>
          </div>
        </section>

        {/* Team & Credits */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-4">Team & Acknowledgments</h2>
          <div className="prose max-w-none">
            <p className="text-sm text-[var(--ink-soft)] mb-4">
              CareerCase is built as part of the Smart India Hackathon 2024 (Problem Statement PS-1781: AI-Powered Career Counseling and Skilling Platform).
            </p>
            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-3">Data Sources & Standards</h3>
              <ul className="space-y-2 text-sm text-[var(--ink-soft)]">
                <li>• NCO-2015: Ministry of Labour & Employment, Government of India</li>
                <li>• NSQF: National Skill Development Corporation (NSDC)</li>
                <li>• Qualification Packs: Sector Skill Councils under NSDC</li>
                <li>• RIASEC Framework: John L. Holland's vocational theory</li>
                <li>• Skills Taxonomy: O*NET (adapted for Indian context)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t-2 border-[var(--ink)] pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl mb-2">Ready to explore?</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Start your career journey with evidence-based guidance.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/onboarding"
                className="inline-block bg-[var(--ink)] px-6 py-3 text-sm text-[var(--paper)] font-mono-ui uppercase tracking-wide"
              >
                Start Onboarding
              </Link>
              <Link
                to="/how-it-works"
                className="inline-block border-2 border-[var(--ink)] px-6 py-3 text-sm font-mono-ui uppercase tracking-wide"
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>
      </GuidanceEntrance>
    </div>
  );
}

export default AboutPage;
