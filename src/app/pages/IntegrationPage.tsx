import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Database, Link as LinkIcon, CheckCircle, Code, Workflow, Shield } from 'lucide-react';
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
            <TextReveal text="Government Integration" />
          </h1>
          <p className="text-xl text-[var(--ink-soft)] leading-relaxed">
            CareerCase is designed to complement India's skill development ecosystem through seamless API integration.
          </p>
        </header>

        {/* Integration Ready Badges */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-6">Integration Status</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div 
              className="border-2 border-[var(--accent-news)] bg-[var(--paper-raised)] p-6 text-center"
              whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
              <CheckCircle size={40} className="mx-auto mb-3 text-[var(--accent-news)]" />
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">SIDH Integration Ready</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                NCO-aligned data model compatible with Skill India Digital Hub
              </p>
            </motion.div>
            <motion.div 
              className="border-2 border-[var(--accent-news)] bg-[var(--paper-raised)] p-6 text-center"
              whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
              <CheckCircle size={40} className="mx-auto mb-3 text-[var(--accent-news)]" />
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">NCS Compatible</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Occupation code mapping for National Career Service integration
              </p>
            </motion.div>
            <motion.div 
              className="border-2 border-[var(--accent-news)] bg-[var(--paper-raised)] p-6 text-center"
              whileHover={{ y: -4, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
            >
              <CheckCircle size={40} className="mx-auto mb-3 text-[var(--accent-news)]" />
              <h3 className="font-mono-ui text-sm uppercase tracking-wide mb-2">PMKVY Aligned</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                NSQF-based pathways aligned with Pradhan Mantri Kaushal Vikas Yojana
              </p>
            </motion.div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="mb-12 bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-8">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Workflow size={28} />
            How CareerCase Complements SIDH
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-news)]">→</span>
                Deterministic Matching Engine
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                While SIDH provides access to job listings and courses, CareerCase adds a transparent, evidence-based recommendation layer that shows exactly why each career fits a user's profile.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[var(--accent-news)]">→</span>
                Multi-Route Pathways
              </h3>
              <p className="text-sm text-[var(--ink-soft)] mb-4">
                CareerCase generates multiple pathway options (fastest, low-risk, credential-based) for each career, helping users choose routes that match their constraints and preferences.
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
                A portable, versioned profile that captures assessments, skills, and aspirations—ready to integrate with DigiLocker and other government platforms.
              </p>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Code size={28} />
            API Integration Points
          </h2>
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
                  Core
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
        "occupationId": "nco_2015_2166_1",
        "ncoCode": "2166.1",
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
                  Core
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
                  Core
                </span>
              </div>
            </div>

            <div className="bg-[var(--paper-raised)] border border-[var(--ink-faint)] p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <code className="font-mono text-sm font-semibold">POST /api/v1/passport/export</code>
                  <p className="text-sm text-[var(--ink-soft)] mt-1">
                    Export Career Passport as JSON for DigiLocker integration
                  </p>
                </div>
                <span className="font-mono-ui text-xs uppercase px-2 py-1 bg-[var(--ink-soft)] text-white">
                  Helper
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Data Flow Diagram */}
        <section className="mb-12 bg-[var(--paper-raised)] border-2 border-[var(--ink)] p-8">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Database size={28} />
            Integration Data Flow
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center">
              <div className="w-32 h-32 mx-auto mb-3 border-2 border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center">
                <span className="font-mono-ui text-xs uppercase">SIDH/NCS Platform</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">User data, job listings, course catalog</p>
            </div>
            
            <div className="flex items-center">
              <LinkIcon size={24} className="text-[var(--ink-soft)]" />
              <div className="mx-2 font-mono-ui text-xs uppercase">API</div>
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
              <p className="text-sm text-[var(--ink-soft)]">Returned to user via SIDH UI</p>
            </div>
          </div>
        </section>

        {/* Security & Compliance */}
        <section className="mb-12">
          <h2 className="font-display text-3xl mb-6 flex items-center gap-3">
            <Shield size={28} />
            Security & Compliance
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">DPDP Act Compliance</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                All data handling complies with India's Digital Personal Data Protection Act, 2023. User consent is explicit, data retention is limited, and deletion rights are honored.
              </p>
            </div>
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">API Authentication</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Integration APIs use JWT-based authentication with role-based access control. Government platforms receive dedicated API keys with rate limiting and usage monitoring.
              </p>
            </div>
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">Data Minimization</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                APIs only request and transmit data necessary for career matching. PII is never logged or stored by the matching engine—only anonymized profile vectors.
              </p>
            </div>
            <div className="border border-[var(--ink-faint)] p-6">
              <h3 className="font-semibold mb-2">Audit Trails</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                All API calls generate audit logs with timestamps, request metadata, and response summaries for compliance monitoring and quality assurance.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t-2 border-[var(--ink)] pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl mb-2">Ready to integrate?</h3>
              <p className="text-sm text-[var(--ink-soft)]">
                Contact us to discuss API access and integration timelines.
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
                API Docs
              </Link>
            </div>
          </div>
        </section>
      </GuidanceEntrance>
    </div>
  );
}

export default IntegrationPage;
