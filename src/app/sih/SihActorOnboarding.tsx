/**
 * SihActorOnboarding
 *
 * Displayed when a user has a valid Supabase account but no CareerCase
 * SIH actor identity yet. This can happen when:
 * - a student just registered and the actor row has not been created
 * - a recruiter/faculty user has been invited but membership is pending
 * - configuration/bootstrap is incomplete in the hosted environment
 *
 * For students: safe self-service bootstrap path is offered if available.
 * For trusted roles: explains the pending state with next steps.
 *
 * This page DOES NOT allow browser-side role escalation.
 */

import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, User, Building2, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { BrandMark } from '../components/BrandMark';

interface SihActorOnboardingProps {
  /** The error message from SihProductionContext */
  error: string;
  /** Called when the user wants to retry loading their identity */
  onRetry?: () => void;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-black bg-white p-6 shadow-[4px_4px_0_#000] ${className}`}>
      {children}
    </div>
  );
}

export function SihActorOnboarding({ error, onRetry }: SihActorOnboardingProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    
    // Attempt to bootstrap student actor before retrying workspace load
    try {
      const { supabase } = await import('../services/supabase');
      const { bootstrapStudentActor } = await import('../services/sih/bootstrapStudentActor');
      const { user } = await import('../context/AuthContext').then(m => ({ user: null })); // Simplified - real auth state would be via hook
      
      if (supabase) {
        await bootstrapStudentActor(supabase);
      }
    } catch (err) {
      console.warn('Bootstrap attempt failed:', err);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    onRetry?.();
    setRetrying(false);
  };

  const isNoActor = error.includes('no active SIH actor');
  const isUnauthorized = error.includes('Unauthorized') || error.includes('permission');

  return (
    <div className="min-h-[80vh] bg-[var(--paper)] flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full">
        {/* Brand */}
        <div className="mb-8 text-center">
          <BrandMark />
        </div>

        {/* Status header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 border-2 border-black/20 bg-[var(--paper)] px-4 py-2 mb-4">
            <AlertCircle size={14} className="text-black/40" />
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-black/40">
              Identity setup needed
            </span>
          </div>

          <div className="flex justify-center mb-4" aria-hidden="true">
            <StickFigure pose="thinking" size={72} className="text-black/40" />
          </div>

          <h1 className="font-[Playfair_Display] text-2xl font-bold text-[var(--ink)] mb-3">
            {isNoActor
              ? 'CareerCase workspace not yet set up'
              : 'Workspace access pending'}
          </h1>

          <p className="font-[Inter] text-sm text-black/55 leading-relaxed max-w-sm mx-auto">
            {isNoActor
              ? 'Your account exists but does not yet have a CareerCase identity record. This is normal for new registrations on the hosted platform.'
              : 'Your account requires an active organization membership to access this workspace.'}
          </p>
        </div>

        {/* Paths */}
        <div className="space-y-4 mb-8">
          {isNoActor && (
            <Card>
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 border-2 border-black flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-mono-ui text-[11px] font-black uppercase tracking-[0.08em] mb-1">
                    Student self-registration
                  </p>
                  <p className="font-[Inter] text-[12px] text-black/55 leading-relaxed mb-3">
                    If you are a student, completing your Career Passport onboarding
                    will create your CareerCase identity. Start with the legacy
                    career guidance section while the SIH workspace initializes.
                  </p>
                  <Link
                    to="/onboarding"
                    className="flex items-center gap-2 bg-black px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] text-white hover:bg-black/85 transition-colors w-fit"
                  >
                    Start onboarding <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 border-2 border-black flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
              <div className="flex-1">
                <p className="font-mono-ui text-[11px] font-black uppercase tracking-[0.08em] mb-1">
                  Industry / Institution access
                </p>
                <p className="font-[Inter] text-[12px] text-black/55 leading-relaxed">
                  Recruiter, faculty, and institution roles require an authorized
                  organization membership. Contact your institution's CareerCase
                  administrator or await an invitation link.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 border-2 border-black flex items-center justify-center shrink-0">
                <GraduationCap size={16} />
              </div>
              <div className="flex-1">
                <p className="font-mono-ui text-[11px] font-black uppercase tracking-[0.08em] mb-1">
                  Explore without a workspace
                </p>
                <p className="font-[Inter] text-[12px] text-black/55 leading-relaxed mb-3">
                  You can still use the Career Passport, assessments, and career
                  direction features while your workspace access is set up.
                </p>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 border-2 border-black px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] text-black hover:bg-black/5 transition-colors w-fit"
                >
                  Open Career Passport <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Retry + demo */}
        <div className="flex flex-wrap items-center gap-3 justify-center">
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="flex items-center gap-2 border-2 border-black px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Checking…' : 'Retry workspace'}
          </button>

          <Link
            to="/demo"
            className="flex items-center gap-2 border-2 border-black/20 px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] text-black/50 hover:text-black hover:border-black transition-colors"
          >
            Try the demo
          </Link>

          <Link
            to="/"
            className="font-mono-ui text-[9px] uppercase tracking-[0.1em] text-black/30 hover:text-black transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        {/* Technical detail (collapsed) */}
        <details className="mt-8 border border-black/10 p-4">
          <summary className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/30 cursor-pointer">
            Technical detail
          </summary>
          <p className="mt-2 font-mono-ui text-[10px] text-black/40 leading-relaxed">
            {error}
          </p>
        </details>
      </div>
    </div>
  );
}
