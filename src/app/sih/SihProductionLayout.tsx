import { Link, NavLink, Outlet } from "react-router";
import { BrandMark } from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { useSihProduction } from "./SihProductionContext";

const student = [
  ["Career", "/career"],
  ["Opportunities", "/opportunities"],
  ["Evidence", "/evidence"],
  ["Applications", "/applications"],
];

export function SihProductionLayout() {
  const { user, signOut } = useAuth();
  const { roles } = useSihProduction();
  const links = [...student];
  if (roles.has("recruiter") || roles.has("industry_partner"))
    links.push(
      ["Industry", "/industry/opportunities"],
      ["Applicants", "/industry/applicants"],
      ["Industry Analytics", "/industry/analytics"],
    );
  if (roles.has("faculty") || roles.has("issuer_verifier"))
    links.push(["Faculty", "/faculty/collaborations"], ["Verification", "/verification"]);
  if (roles.has("institution_admin"))
    links.push(
      ["Skills Intelligence", "/institution/skills-intelligence"],
      ["Interventions", "/institution/interventions"],
    );
  else if (roles.has("policy_program_analyst"))
    links.push(["Program Analytics", "/institution/skills-intelligence"]);
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b-2 border-black bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/career" aria-label="CareerCase career workspace">
            <BrandMark compact />
          </Link>
          <nav
            className="flex flex-1 flex-wrap justify-center gap-1"
            aria-label="CareerCase workspaces"
          >
            {links.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `min-h-11 px-3 py-3 font-mono-ui text-[11px] font-black uppercase ${isActive ? "bg-black text-white" : "hover:bg-black/5"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 border-2 border-black px-3 font-mono-ui text-[10px] font-black uppercase"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="min-h-11 bg-black px-4 py-3 font-mono-ui text-[10px] font-black uppercase text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
