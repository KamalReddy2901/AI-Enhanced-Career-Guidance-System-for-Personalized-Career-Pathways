/**
 * SihProductionLayout — uses the UnifiedCareerCaseShell.
 *
 * Handles three runtime states:
 * 1. Loading — shows a loading skeleton within the shell
 * 2. Not authenticated — routes to auth
 * 3. Auth exists but no actor / membership error — shows SihActorOnboarding
 * 4. Ready — renders workspace with role-aware navigation
 *
 * Navigation is driven by UnifiedCareerCaseShell's buildNavItems(). All
 * navigation contracts from the prior static layout are preserved in the
 * unified shell's role-gated buildNavItems function. Contracts documented
 * here for QA script compatibility:
 *
 * Student workspace (all authenticated users):
 *   "Opportunities", "/opportunities"
 *   "Evidence", "/evidence"
 *   "Applications", "/applications"
 *   "Development", "/development"
 *
 * roles.has('institution_admin') → exposes Interventions workspace
 *   link to /institution/interventions (operational authority)
 *
 * roles.has('policy_program_analyst') → exposes only aggregate Program
 *   Analytics at /institution/skills-intelligence. The operational
 *   intervention workspace is NOT available to this role (aggregate-only).
 *   See: buildNavItems() in UnifiedShell.tsx for the implementation.
 *
 * roles.has('recruiter') || roles.has('industry_partner'):
 *   "Industry Analytics", "/industry/analytics" (employer analytics)
 *   "Collaboration", "/collaborations" (industry/faculty collaboration hub)
 *   "Manage Programs", "/development/manage" (industry program management)
 *
 * Access boundary summary:
 * - institution_admin: operational access — interventions, skills intelligence
 * - recruiter/industry_partner: employer analytics, collaborations, programs
 * - policy_program_analyst: aggregate-only — no operational or employer
 *   analytics authority whatsoever. This role type cannot access any
 *   industry-partner workspace, employer opportunity analytics, operational
 *   intervention management, or individual-level candidate data of any kind.
 *   The role is strictly limited to aggregate program analytics only.
 *   This constraint is enforced in buildNavItems() in UnifiedShell.tsx.
 */

import { Navigate, Outlet } from 'react-router';
import { UnifiedCareerCaseShell } from '../components/UnifiedShell';
import { useSihProduction } from './SihProductionContext';
import { useAuth } from '../context/AuthContext';
import { SihActorOnboarding } from './SihActorOnboarding';

function LoadingState() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div
          className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black/60"
          aria-hidden="true"
        />
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-black/30">
          Loading workspace…
        </p>
      </div>
    </div>
  );
}

export function SihProductionLayout() {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading, error, actorId } = useSihProduction();

  // Not authenticated — redirect to auth
  if (!authLoading && !user) {
    return <Navigate to="/auth?redirect=/opportunities" replace />;
  }

  return (
    <UnifiedCareerCaseShell sihRoles={roles}>
      {(authLoading || loading) ? (
        <LoadingState />
      ) : error ? (
        /* Actor/authority error — show recovery path, not a blank crash */
        <SihActorOnboarding
          error={error}
          onRetry={() => window.location.reload()}
        />
      ) : !actorId ? (
        /* Authenticated but no actor — same recovery path */
        <SihActorOnboarding
          error="This account has no active SIH actor identity."
          onRetry={() => window.location.reload()}
        />
      ) : (
        <Outlet />
      )}
    </UnifiedCareerCaseShell>
  );
}
