import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Database, Link as LinkIcon, CircleDashed, Code, Workflow, Shield } from 'lucide-react';
import { GuidanceEntrance } from '../components/guidance/GuidanceEntrance';
import { TextReveal } from '../motion/TextReveal';
import { NCOBadge } from '../components/NCOBadge';

export function IntegrationPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] px-6 py-16 pb-24 md:py-24">
      <GuidanceEntrance className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 border-b-2 border-[var(--ink)] pb-8">
          <h1 className="font-display text-6xl leading-[1.05] tracking-tighter mb-4">
            <TextReveal text="Government Integration Roadmap" />
          </h1>
          <p className="text-xl text-[var(--ink-soft)] leading-relaxed">
            CareerCase is designed to complement India's skill-development ecosystem. This page documents current data-model groundwork and proposed interfaces—not deployed government connectors.
          </p>
        </header>

        {/* Integration Groundwork Badges */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-6">Current Groundwork</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div 
              className="border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6 text-center"
              whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
              <CircleDashed size={40} className="mx-auto mb-3 text-[var(--accent-news)]" />
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">SIDH data-model alignment</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                NCO-aligned prototype structure; a production connector and platform review are pending
              </p>
            </motion.div>
            <motion.div 
              className="border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6 text-center"
              whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
              <CircleDashed size={40} className="mx-auto mb-3 text-[var(--accent-news)]" />
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">NCS code mapping</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Demonstration occupations carry NCO mappings; no live NCS connection is implemented
              </p>
            </motion.div>
            <motion.div 
              className="border-2 border-[var(--ink-faint)] bg-[var(--paper-raised)] p-6 text-center"
              whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
              <CircleDashed size={40} className="mx-auto mb-3 text-[var(--accent-news)]" />
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">PMKVY route alignment</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Prototype routes use NSQF-level metadata; provider eligibility still needs source verification
              </p>
            </motion.div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="mb-12 bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-8">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Workflow size={28} />
            How CareerCase Could Complement SIDH
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-news)]">→</span>
                Deterministic Matching Engine
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                A future host platform could use CareerCase's transparent, evidence-led recommendation layer to show why a career fits a user's profile.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-news)]">→</span>
                Multi-Route Pathways
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                CareerCase generates exactly three route options—focused, lower-risk, and credential-first—for each career, helping users compare durations and trade-offs against their constraints.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-news)]">→</span>
                Skill-Gap Analysis
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                Detailed gap reports show users exactly which skills they need to develop, with proficiency targets and evidence tracking for each requirement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-news)]">→</span>
                Career Passport
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                A portable, versioned profile captures assessments, skills, and aspirations. JSON export provides a starting point for a future DigiLocker or government-platform contract; no such connector exists today.
              </p>
            </div>
          </div>
        </section>

        {/* Proposed API Endpoints */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Code size={28} />
            Proposed API Contract — Not Deployed
          </h2>
          <p className="mb-6 border-l-4 border-[var(--accent-news)] pl-4 text-sm text-[var(--ink-soft)]">
            The routes below are illustrative interface contracts for future partner discussions. CareerCase does not currently expose a public <code>/api/v1</code> integration service.
          </p>
          <div className="space-y-4">
            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <code className="font-mono text-sm font-semibold">POST /api/v1/recommendations</code>
                  <p className="text-sm text-[var(--ink-soft)] mt-1">
                    Submit user profile and receive ranked career recommendations
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase px-2 py-1 bg-[var(--accent-news)] text-white">
                  Proposed
                </span>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold">Request/Response Schema</summary>
                <pre className="mt-2 p-3 bg-[var(--paper)] border border-[var(--ink-faint)] overflow-x-auto text-xs">
{`{
  "input": {
    "segment": "college_student",
    "riasec": { "R": 45, "I": 65, "A": 70, ... },
    "skills": [...],
    "aspirations": { "themes": [...], "horizonYears": 2 }
  },
  "output": {
    "recommendations": [
      {
        "occupationId": "graphic-designer",
        "ncoCode": "2166.0100",
        "title": "Graphic Designer",
        "totalScore": 87,
        "confidence": "high",
        "topReasons": [...],
        "skillGapPreview": [...]
      }
    ]
  }
}`}
                </pre>
              </details>
            </div>

            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <code className="font-mono text-sm font-semibold">GET /api/v1/pathway/:occupationId</code>
                  <p className="text-sm text-[var(--ink-soft)] mt-1">
                    Get multi-route career pathway for a specific occupation
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase px-2 py-1 bg-[var(--ink)] text-white">
                  Proposed
                </span>
              </div>
            </div>

            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <code className="font-mono text-sm font-semibold">POST /api/v1/skill-gap</code>
                  <p className="text-sm text-[var(--ink-soft)] mt-1">
                    Analyze skill gaps between user profile and target occupation
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase px-2 py-1 bg-[var(--ink)] text-white">
                  Proposed
                </span>
              </div>
            </div>

            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <code className="font-mono text-sm font-semibold">POST /api/v1/passport/export</code>
                  <p className="text-sm text-[var(--ink-soft)] mt-1">
                    Export Career Passport JSON for a future DigiLocker contract
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase px-2 py-1 bg-[var(--ink-soft)] text-white">
                  Proposed
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Proposed Data Flow Diagram */}
        <section className="mb-12 bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Database size={28} />
            Proposed Integration Data Flow
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="w-32 h-32 mx-auto mb-3 border-2 border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center">
                <span className="font-mono-ui text-xs uppercase">Future Host Platform</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">Authorized minimum profile and catalog data</p>
            </div>
            
            <div className="flex items-center">
              <LinkIcon size={24} className="text-[var(--ink-soft)]" />
              <div className="mx-2 font-mono-ui text-xs uppercase">Proposed API</div>
              <LinkIcon size={24} className="text-[var(--ink-soft)]" />
            </div>

            <div className="flex-1 text-center">
              <div className="w-32 h-32 mx-auto mb-3 border-2 border-[var(--accent-news)] bg-[var(--paper)] flex items-center justify-center">
                <NCOBadge variant="compact" />
              </div>
              <p className="text-sm text-[var(--ink-soft)]">CareerCase matching engine</p>
            </div>

            <div className="flex items-center">
              <LinkIcon size={24} className="text-[var(--ink-soft)]" />
              <div className="mx-2 font-mono-ui text-xs uppercase">Results</div>
              <LinkIcon size={24} className="text-[var(--ink-soft)]" />
            </div>

            <div className="flex-1 text-center">
              <div className="w-32 h-32 mx-auto mb-3 border-2 border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center">
                <span className="font-mono-ui text-xs uppercase text-center">Recommendations<br/>& Pathways</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">Would return through the host interface</p>
            </div>
          </div>
        </section>

        {/* Production Security Requirements */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Shield size={28} />
            Production Integration Requirements
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">DPDP-Aware Controls</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                The prototype includes explicit consent, export, deletion, and a guardian-confirmation demo flow. Formal legal review, production identity verification, and a compliance assessment are still required.
              </p>
            </div>
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">Proposed API Authentication</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                The provider-neutral runtime enforces configuration state, capability checks, rate limiting boundaries, health/audit state and controlled failure handling. Partner-specific authentication and live credentials remain INTEGRATION-READY until an approved provider contract is supplied.
              </p>
            </div>
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">Data Minimization</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                ATS exports use an explicit privacy-minimized allowlist and carry source provenance, external identifiers and freshness metadata. Partner retention and field contracts still require a documented privacy review before any live transfer.
              </p>
            </div>
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">Integration Audit Trails</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Connector sync, webhook and disconnect operations append audit state and expose health/failure metadata. Live partner-call delivery and hosted monitoring remain CREDENTIAL-GATED; the operations runbook defines the deployment and incident procedures.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t-2 border-[var(--ink)] pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl mb-2">Planning a controlled pilot?</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                The proposed contract is available for discussion, but there is no public integration API access today.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/about"
                className="inline-block border-2 border-[var(--ink)] px-6 py-3 text-sm font-mono-ui uppercase tracking-wide hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
              >
                Learn More
              </Link>
              <Link
                to="/help"
                className="inline-block bg-[var(--ink)] px-6 py-3 text-sm text-[var(--paper)] font-mono-ui uppercase tracking-wide"
              >
                Prototype Help
              </Link>
            </div>
          </div>
        </section>
      </GuidanceEntrance>
    </div>
  );
}

export default IntegrationPage;
