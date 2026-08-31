/**
 * UnifiedCareerCaseShell
 *
 * The single coherent shell used across both legacy CareerCase (Engine A /
 * Career Guidance) and SIH26044 SIH production workspace (Engine B /
 * Opportunity Readiness).  Users see ONE product — CareerCase — not two
 * separate applications.
 *
 * Navigation is role-aware and workspace-aware. The Engine A / Engine B
 * privacy boundary is never exposed in the navigation itself; it is enforced
 * structurally by the separate runtime contexts.
 */

import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, X, ChevronDown, LogIn, LogOut, User,
  Briefcase, BookOpen, Target, FileText, Layers,
  BarChart2, Users, Building2, GraduationCap, Globe,
  Bell, HelpCircle, Settings,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useAuth } from '../context/AuthContext';
import { LanguageSwitcher } from '../i18n';

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */

export type WorkspaceRole =
  | 'student'
  | 'recruiter'
  | 'faculty'
  | 'institution'
  | 'policy'
  | 'public';

interface NavItem {
  label: string;
  to: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: string;
}

interface UnifiedShellProps {
  /** Current workspace role — determines which navigation items to show */
  role?: WorkspaceRole;
  /** Set of SIH actor roles (from SihProductionContext) */
  sihRoles?: ReadonlySet<string>;
  /** Whether this shell wraps the SIH production routes */
  isSihWorkspace?: boolean;
  children?: React.ReactNode;
}

/* ──────────────────────────────────────────────────────────────────────────
   Navigation definitions
   ────────────────────────────────────────────────────────────────────────── */

function buildNavItems(
  user: { id: string } | null,
  sihRoles: ReadonlySet<string>,
  location: string,
): NavItem[] {
  const isAuth = location.startsWith('/auth');
  if (isAuth) return [];

  const items: NavItem[] = [];

  // ── Opportunities — visible to everyone once signed in ──────────────────
  if (user) {
    items.push({
      label: 'Opportunities',
      to: '/opportunities',
      icon: <Target size={13} />,
    });
  }

  // ── My Career — Career Guidance (Engine A) ──────────────────────────────
  if (user) {
    items.push({
      label: 'My Career',
      to: '/career',
      icon: <BookOpen size={13} />,
      children: [
        { label: 'Career Passport', to: '/passport', icon: <FileText size={12} /> },
        { label: 'Career Direction', to: '/recommendations', icon: <Target size={12} /> },
        { label: 'Assessments', to: '/assess', icon: <Layers size={12} /> },
        { label: 'Pathways', to: '/pathways', icon: <BarChart2 size={12} /> },
        { label: 'Counselor', to: '/counselor', icon: <User size={12} /> },
      ],
    });
  }

  // ── Build Evidence ───────────────────────────────────────────────────────
  if (user) {
    items.push({
      label: 'Evidence',
      to: '/evidence',
      icon: <FileText size={13} />,
      children: [
        { label: 'Evidence Ledger', to: '/evidence', icon: <FileText size={12} /> },
        { label: 'Verification', to: '/verification', icon: <Layers size={12} /> },
        { label: 'Close This Gap', to: '/gap-closure', icon: <Target size={12} /> },
        { label: 'Development', to: '/development', icon: <BarChart2 size={12} /> },
      ],
    });
  }

  // ── Applications ─────────────────────────────────────────────────────────
  if (user) {
    items.push({
      label: 'Applications',
      to: '/applications',
      icon: <Briefcase size={13} />,
    });
  }

  // ── Industry / Recruiter workspace ───────────────────────────────────────
  if (user && (sihRoles.has('recruiter') || sihRoles.has('industry_partner'))) {
    items.push({
      label: 'Industry',
      to: '/industry/opportunities',
      icon: <Building2 size={13} />,
      children: [
        { label: 'Opportunities', to: '/industry/opportunities', icon: <Target size={12} /> },
        { label: 'Applicants', to: '/industry/applicants', icon: <Users size={12} /> },
        { label: 'Questionnaires', to: '/industry/questionnaires', icon: <Layers size={12} /> },
        { label: 'Programs', to: '/development/manage', icon: <BookOpen size={12} /> },
        { label: 'Collaborations', to: '/collaborations', icon: <Users size={12} /> },
        { label: 'Skills Intelligence', to: '/industry/analytics', icon: <BarChart2 size={12} /> },
      ],
    });
  }

  // ── Faculty workspace ────────────────────────────────────────────────────
  if (user && sihRoles.has('faculty')) {
    items.push({
      label: 'Faculty',
      to: '/faculty',
      icon: <GraduationCap size={13} />,
      children: [
        { label: 'Verification', to: '/verification', icon: <Layers size={12} /> },
        { label: 'Faculty Opportunities', to: '/faculty/opportunities', icon: <Target size={12} /> },
        { label: 'Engagements', to: '/faculty/engagements', icon: <Briefcase size={12} /> },
        { label: 'Collaborations', to: '/faculty/collaborations', icon: <Users size={12} /> },
      ],
    });
  }

  // ── Institution workspace ────────────────────────────────────────────────
  if (user && sihRoles.has('institution_admin')) {
    items.push({
      label: 'Institution',
      to: '/institution',
      icon: <Building2 size={13} />,
      children: [
        { label: 'Skills Intelligence', to: '/institution/skills-intelligence', icon: <BarChart2 size={12} /> },
        { label: 'Interventions', to: '/institution/interventions', icon: <Target size={12} /> },
        { label: 'Collaborations', to: '/collaborations', icon: <Users size={12} /> },
      ],
    });
  }

  // ── Policy analyst ───────────────────────────────────────────────────────
  if (user && sihRoles.has('policy_program_analyst')) {
    items.push({
      label: 'Analytics',
      to: '/institution/skills-intelligence',
      icon: <Globe size={13} />,
    });
  }

  return items;
}

/* ──────────────────────────────────────────────────────────────────────────
   Subcomponents
   ────────────────────────────────────────────────────────────────────────── */

function DesktopDropdownMenu({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isActive = item.children
    ? item.children.some(c => location.pathname.startsWith(c.to))
    : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`flex h-11 items-center gap-1.5 px-2.5 font-mono-ui text-[10.5px] font-black uppercase tracking-[0.08em] transition-colors
          ${isActive ? 'text-black' : 'text-black/50 hover:text-black/80'}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full left-0 z-50 min-w-[180px] border-2 border-black bg-[var(--paper)] shadow-[4px_4px_0_#000]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
          >
            {item.children!.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                role="menuitem"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 border-b border-black/8 px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] transition-colors last:border-b-0
                  ${isActive ? 'bg-black text-white' : 'hover:bg-black/5'}`
                }
              >
                {child.icon}
                {child.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DesktopNavItem({ item }: { item: NavItem }) {
  const location = useLocation();
  if (item.children && item.children.length > 0) {
    return <DesktopDropdownMenu item={item} />;
  }
  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  return (
    <NavLink
      to={item.to}
      className={({ isActive: navActive }) =>
        `flex h-11 items-center gap-1.5 px-2.5 font-mono-ui text-[10.5px] font-black uppercase tracking-[0.08em] transition-colors
        ${navActive || isActive ? 'text-black' : 'text-black/50 hover:text-black/80'}`
      }
    >
      {item.label}
    </NavLink>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main shell
   ────────────────────────────────────────────────────────────────────────── */

export function UnifiedCareerCaseShell({
  sihRoles = new Set(),
  children,
}: UnifiedShellProps) {
  const { user, signOut, isSupabaseConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const isAuthPage = location.pathname === '/auth';
  const navItems = buildNavItems(user, sihRoles, location.pathname);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  // Keyboard: Escape closes mobile menu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-black focus:px-4 focus:py-2 focus:text-white focus:text-sm"
      >
        Skip to main content
      </a>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {!isAuthPage && (
        <header
          className="sticky top-0 z-50 border-b-2 border-black bg-[var(--paper)]/95 backdrop-blur-sm"
          role="banner"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-0 h-14">
            {/* BrandMark */}
            <Link
              to="/"
              className="shrink-0 flex items-center min-h-[44px] min-w-[44px] -ml-1 pl-1"
              aria-label="CareerCase — home"
            >
              <BrandMark compact />
            </Link>

            {/* Tagline (desktop only) */}
            <span
              className="hidden lg:block font-mono-ui text-[9px] uppercase tracking-[0.15em] text-black/30 ml-1"
              aria-hidden="true"
            >
              Career Guidance × Opportunity Readiness
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Desktop nav */}
            {navItems.length > 0 && (
              <nav
                className="hidden md:flex items-center gap-0"
                aria-label="CareerCase primary navigation"
              >
                {navItems.map(item => (
                  <DesktopNavItem key={item.to} item={item} />
                ))}
              </nav>
            )}

            {/* Desktop right: language + account */}
            <div className="hidden md:flex items-center gap-2 ml-2">
              <LanguageSwitcher compact />

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(prev => !prev)}
                    className="flex h-11 min-w-[44px] items-center gap-1.5 px-2 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] text-black/60 hover:text-black transition-colors"
                    aria-label="Account menu"
                    aria-expanded={accountOpen}
                  >
                    <User size={14} />
                    <ChevronDown size={10} className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {accountOpen && (
                      <motion.div
                        className="absolute right-0 top-full z-50 min-w-[180px] border-2 border-black bg-[var(--paper)] shadow-[4px_4px_0_#000]"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        role="menu"
                      >
                        <Link
                          to="/settings"
                          role="menuitem"
                          className="flex items-center gap-2.5 border-b border-black/8 px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] hover:bg-black/5 transition-colors"
                        >
                          <Settings size={11} /> Settings
                        </Link>
                        <Link
                          to="/help"
                          role="menuitem"
                          className="flex items-center gap-2.5 border-b border-black/8 px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] hover:bg-black/5 transition-colors"
                        >
                          <HelpCircle size={11} /> Help
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { void signOut(); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em] hover:bg-black/5 transition-colors text-left"
                        >
                          <LogOut size={11} /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : isSupabaseConfigured ? (
                <Link
                  to="/auth"
                  className="flex h-11 items-center gap-2 bg-black px-4 font-mono-ui text-[10px] font-black uppercase text-white hover:bg-black/85 transition-colors"
                >
                  <LogIn size={13} />
                  Sign in
                </Link>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="flex md:hidden h-11 w-11 items-center justify-center text-black/60 hover:text-black transition-colors"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            </button>
          </div>

          {/* ── Mobile nav ──────────────────────────────────────────────────── */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                id="mobile-nav"
                className="md:hidden border-t-2 border-black bg-[var(--paper)] overflow-y-auto max-h-[70vh]"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                role="navigation"
                aria-label="Mobile navigation"
              >
                {navItems.map(item => (
                  <div key={item.to} className="border-b border-black/8">
                    {item.children && item.children.length > 0 ? (
                      <>
                        <div className="px-5 py-3 font-mono-ui text-[10px] font-black uppercase tracking-[0.12em] text-black/40">
                          {item.label}
                        </div>
                        {item.children.map(child => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `flex items-center gap-3 py-3 pl-8 pr-5 font-mono-ui text-[10px] font-black uppercase tracking-[0.08em]
                              ${isActive ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5'}`
                            }
                          >
                            {child.icon}
                            {child.label}
                          </NavLink>
                        ))}
                      </>
                    ) : (
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-5 py-3.5 font-mono-ui text-[10.5px] font-black uppercase tracking-[0.08em]
                          ${isActive ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5'}`
                        }
                      >
                        {item.icon}
                        {item.label}
                      </NavLink>
                    )}
                  </div>
                ))}

                {/* Mobile auth / account */}
                <div className="border-b border-black/8 px-5 py-3">
                  <LanguageSwitcher compact={false} />
                </div>

                {user ? (
                  <>
                    <NavLink
                      to="/settings"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-5 py-3.5 font-mono-ui text-[10.5px] font-black uppercase tracking-[0.08em]
                        ${isActive ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5'}`
                      }
                    >
                      <Settings size={13} /> Settings
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-3 px-5 py-3.5 font-mono-ui text-[10.5px] font-black uppercase tracking-[0.08em] text-black/70 hover:bg-black/5 text-left"
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </>
                ) : isSupabaseConfigured ? (
                  <Link
                    to="/auth"
                    className="flex items-center gap-3 px-5 py-3.5 font-mono-ui text-[10.5px] font-black uppercase tracking-[0.08em] bg-black text-white"
                  >
                    <LogIn size={13} /> Sign in
                  </Link>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main id="main-content">
        {children ?? <Outlet />}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      {!isAuthPage && (
        <footer className="border-t-2 border-black/10 bg-[var(--paper)] px-6 py-10 mt-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-start gap-8 justify-between">
              <div>
                <BrandMark />
                <p className="mt-3 max-w-xs font-[Inter] text-[12px] text-black/40 leading-relaxed">
                  Evidence-backed opportunity readiness & skills intelligence
                  for the academia–industry ecosystem.
                </p>
                <p className="mt-2 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/25">
                  SIH26044 · Portal for Academia–Industry Collaboration
                </p>
              </div>
              <div className="flex flex-wrap gap-12">
                <div>
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/30 mb-3">Product</p>
                  <div className="flex flex-col gap-2">
                    {[
                      ['How It Works', '/how-it-works'],
                      ['About', '/about'],
                      ['Integrations', '/integration'],
                      ['Help', '/help'],
                    ].map(([label, to]) => (
                      <Link key={to} to={to} className="font-mono-ui text-[10px] text-black/50 hover:text-black transition-colors">{label}</Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-black/30 mb-3">For</p>
                  <div className="flex flex-col gap-2">
                    {[
                      ['Students', '/auth?mode=signup'],
                      ['Industry', '/auth?mode=signup'],
                      ['Faculty', '/auth?mode=signup'],
                      ['Institutions', '/auth?mode=signup'],
                    ].map(([label, to]) => (
                      <Link key={label} to={to} className="font-mono-ui text-[10px] text-black/50 hover:text-black transition-colors">{label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10 border-t border-black/8 pt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono-ui text-[9px] text-black/30 uppercase tracking-[0.1em]">
                © 2026 CareerCase · Eternals · SIH26044
              </p>
              <p className="font-mono-ui text-[9px] text-black/25 uppercase tracking-[0.08em]">
                MIT License · Curated NCO-2015/NSQF · Evidence-based · Not hiring probability
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
