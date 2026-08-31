/**
 * SihProductionLayout — uses the UnifiedCareerCaseShell.
 *
 * Handles three runtime states:
 * 1. Loading — shows a loading skeleton within the shell
 * 2. Not authenticated — routes to auth
 * 3. Auth exists but no actor / membership error — shows SihActorOnboarding
 * 4. Ready — renders workspace with role-aware navigation
 *
 * Navigation is driven by UnifiedCareerCaseShell's buildNavItems(). Relevant
 * authority contracts enforced in the shell's navigation builder:
 *
 * roles.has('institution_admin') → exposes Interventions workspace
 *   link to /institution/interventions (operational authority)
 *
 * roles.has('policy_program_analyst') → exposes only aggregate Program
 *   Analytics view at /institution/skills-intelligence; the operational
 *   intervention workspace is NOT available to this role.
 *   Aggregate-only access: no individual, operational, or employer-level
 *   authority. See: buildNavItems() in UnifiedShell.tsx for the routing
 *   logic that enforces this boundary at navigation construction time.
 *
 * roles.has('recruiter') || roles.has('industry_partner') → exposes
 *   Industry Analytics workspace — employer-scoped aggregate intelligence.
 *   Employer analytics route: /industry/analytics (recruiter/partner only).
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
