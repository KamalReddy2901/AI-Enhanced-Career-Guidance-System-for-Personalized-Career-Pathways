import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Outlet } from "react-router";
import type { ActorId, ActorRole, OrganizationId } from "../domain";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { SihBrowserDal } from "../services/sih/browserDal";
import { SihTrustedApiClient } from "../services/sih/SihTrustedApiClient";

export interface SihMembershipContext {
  readonly organizationId: OrganizationId;
  readonly organizationName: string;
  readonly roles: readonly ActorRole[];
}

interface SihProductionValue {
  readonly actorId: ActorId | null;
  readonly memberships: readonly SihMembershipContext[];
  readonly roles: ReadonlySet<ActorRole>;
  readonly dal: SihBrowserDal | null;
  readonly trustedApi: SihTrustedApiClient | null;
  readonly loading: boolean;
  readonly error?: string;
}

const Context = createContext<SihProductionValue | null>(null);

function Boundary({ children }: { readonly children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [actorId, setActorId] = useState<ActorId | null>(null);
  const [memberships, setMemberships] = useState<
    readonly SihMembershipContext[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const dal = useMemo(
    () => (supabase ? new SihBrowserDal(supabase) : null),
    [],
  );
  const workerOrigin =
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_WORKER_URL ?? "";
  const trustedApi = useMemo(
    () =>
      supabase && workerOrigin
        ? new SihTrustedApiClient(supabase, workerOrigin)
        : null,
    [workerOrigin],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase || !dal) {
      setActorId(null);
      setMemberships([]);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const currentActorId = await dal.getCurrentActorId();
      if (!currentActorId)
        throw new Error("This account has no active SIH actor identity.");
      const db = supabase.schema("sih26044");
      const { data: membershipRows, error: membershipError } = await db
        .from("organization_memberships")
        .select("id,organization_id,organizations(display_name)")
        .eq("actor_id", currentActorId)
        .eq("status", "active");
      if (membershipError) throw membershipError;
      const ids = (membershipRows ?? []).map((row) => row.id as string);
      const { data: roleRows, error: roleError } = ids.length
        ? await db
            .from("organization_membership_roles")
            .select("membership_id,role")
            .in("membership_id", ids)
        : { data: [], error: null };
      if (roleError) throw roleError;
      const byMembership = new Map<string, ActorRole[]>();
      for (const row of roleRows ?? [])
        byMembership.set(row.membership_id as string, [
          ...(byMembership.get(row.membership_id as string) ?? []),
          row.role as ActorRole,
        ]);
      const contexts = (membershipRows ?? []).map((row) => ({
        organizationId: row.organization_id as OrganizationId,
        organizationName:
          (row.organizations as unknown as { display_name?: string } | null)?.display_name ??
          "Organization",
        roles: byMembership.get(row.id as string) ?? [],
      }));
      if (active) {
        setActorId(currentActorId);
        setMemberships(contexts);
        setError(undefined);
      }
    })()
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load SIH authority.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, dal, user]);

  const roles = useMemo(
    () => new Set(memberships.flatMap((item) => item.roles)),
    [memberships],
  );
  return (
    <Context.Provider
      value={{
        actorId,
        memberships,
        roles,
        dal,
        trustedApi,
        loading: authLoading || loading,
        error,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function SihProductionRuntime() {
  return (
    <AuthProvider>
      <Boundary>
        <Outlet />
      </Boundary>
    </AuthProvider>
  );
}

export function useSihProduction() {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      "useSihProduction must be used inside SihProductionRuntime",
    );
  return value;
}
