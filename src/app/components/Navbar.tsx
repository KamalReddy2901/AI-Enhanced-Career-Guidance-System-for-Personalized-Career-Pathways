import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Home, Compass, Settings, Menu, X, Map, MessageCircle, ClipboardCheck, Route, UserRound, LogIn, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { sounds } from '../utils/sounds';
import { LanguageSwitcher, useT } from '../i18n';

export function Navbar() {
  const { t } = useT();
  const location = useLocation();
  const { history } = useApp();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const isHome = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';

  const historyCount = history.length + favorites.length;

  useEffect(() => { setMenuOpen(false); setPersonalOpen(false); }, [location.pathname]);

  if (isAuthPage) return null;

  const navLinks = [
    { to: '/', icon: <Home size={12} />, label: t('home'), active: isHome },
    { to: '/job', icon: <Compass size={12} />, label: t('explore'), active: ['/job','/quiz','/mood','/compare','/career-transition','/roadmap'].some(path => location.pathname.startsWith(path)) },
    { to: '/counselor', icon: <MessageCircle size={12} />, label: t('counselor'), active: location.pathname === '/counselor' },
    ...user ? [
      {
        to: '/history',
        icon: <Clock size={12} />,
        label: historyCount > 0 ? `${t('archive')} (${historyCount})` : t('archive'),
        active: location.pathname === '/history' || location.pathname === '/favorites',
      },
      { to: '/settings', icon: <Settings size={12} />, label: t('settings'), active: location.pathname === '/settings' },
    ] : [{ to: '/settings', icon: <Settings size={12} />, label: t('settings'), active: location.pathname === '/settings' }],
  ];
  const personalLinks = [
    { to: '/assess', icon: <ClipboardCheck size={13} />, label: t('assess'), active: location.pathname.startsWith('/assess') },
    { to: '/recommendations', icon: <Map size={13} />, label: t('recommendations'), active: location.pathname === '/recommendations' },
    { to: '/pathways', icon: <Route size={13} />, label: t('pathways'), active: location.pathname.startsWith('/pathway') || location.pathname === '/pathways' },
    { to: '/passport', icon: <UserRound size={13} />, label: t('passport'), active: location.pathname === '/passport' },
  ];
  const personalActive = personalLinks.some(link => link.active);

  return (
    <>
      <motion.nav
        className="sticky top-0 left-0 right-0 z-50 border-b border-[var(--ink)] bg-[var(--paper)]/90 backdrop-blur-md"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group shrink-0"
            aria-label="CareerCase home"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <span className="flex flex-col">
              <span className="font-display text-lg italic tracking-tight text-[var(--ink)] transition-opacity group-hover:opacity-70">CareerCase</span>
              <span className="font-mono-ui text-[8px] tracking-[.14em] text-[var(--ink-soft)]">EST. 2025 — VOL. II</span>
            </span>
          </Link>

          {user ? <>
          {/* Desktop nav links */}
          <div className="hidden md:flex min-w-0 flex-1 items-center justify-end gap-0">
            {navLinks.map(link => (
              link.to === '/counselor' ? <><PersonalMenu key="personal" links={personalLinks} open={personalOpen} setOpen={setPersonalOpen} active={personalActive} /><NavLink key={link.to} {...link} /></> : <NavLink key={link.to} {...link} />
            ))}
            <LanguageSwitcher compact />
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => { sounds.toggle(); setMenuOpen(prev => !prev); }}
              className="h-11 w-11 p-2 text-black/60 hover:text-black transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          </> : <Link to="/auth?mode=signup" className="flex min-h-11 items-center gap-2 bg-black px-4 font-mono-ui text-xs uppercase text-white transition-opacity hover:opacity-80"><LogIn size={14} />Sign in</Link>}
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden sm:block absolute right-6 -bottom-5 pointer-events-none" aria-hidden="true">
          <span className="font-[JetBrains_Mono] text-black/12" style={{ fontSize: '0.52rem' }}>
            Ctrl+K search · Esc back
          </span>
        </div>
      </motion.nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed top-14 left-0 right-0 z-40 bg-[#f9f8f7]/98 backdrop-blur-md border-b border-black/8 shadow-lg md:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
              <div className="mb-2 flex justify-end"><LanguageSwitcher compact /></div>
              {navLinks.map(link => (
                link.to === '/counselor' ? <><div key="mobile-personal" className="border-y border-black/8 py-1">
                  <div className="px-4 py-2 font-mono-ui text-[0.7rem] uppercase tracking-wide text-black/40">Personal</div>
                  {personalLinks.map(personal => <Link key={personal.to} to={personal.to} onClick={() => sounds.navigate()} className={`font-mono-ui flex items-center gap-3 px-5 py-3 text-xs uppercase tracking-wide ${personal.active ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}>{personal.icon}{personal.label}</Link>)}
                </div><Link key={link.to}
                  to={link.to}
                  onClick={() => sounds.navigate()}
                  className={`font-mono-ui flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wide ${link.active ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                  style={{ fontSize: '0.88rem' }}
                >{link.icon}{link.label}</Link></> :
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => sounds.navigate()}
                  className={`font-mono-ui flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wide transition-[background-color,color] ${
                    link.active
                      ? 'bg-black text-white'
                      : 'text-black/60 hover:bg-black/5 hover:text-black'
                  }`}
                  style={{ fontSize: '0.88rem' }}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PersonalMenu({ links, open, setOpen, active }: { links: Array<{ to: string; icon: React.ReactNode; label: string; active: boolean }>; open: boolean; setOpen: (open: boolean) => void; active: boolean }) {
  return <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={`label-caps flex shrink-0 items-center gap-1 px-2 py-2 transition-colors ${active ? 'bg-black text-white' : 'text-black/55 hover:text-black hover:bg-black/5'}`} style={{ fontSize: '0.62rem' }}>
      <UserRound size={12} /><span>Personal</span><ChevronDown size={11} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
    </button>
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-full mt-1 w-56 border border-black/15 bg-[var(--paper)] p-1 shadow-lg">
      <p className="px-3 py-2 font-mono-ui text-[0.58rem] uppercase tracking-[.14em] text-black/40">Your tailored workspace</p>
      {links.map(link => <Link key={link.to} to={link.to} onClick={() => sounds.navigate()} className={`flex items-center gap-2 px-3 py-2.5 font-mono-ui text-[0.68rem] uppercase tracking-wide ${link.active ? 'bg-black text-white' : 'text-black/65 hover:bg-black/5 hover:text-black'}`}>{link.icon}{link.label}</Link>)}
    </motion.div>}</AnimatePresence>
  </div>;
}

function NavLink({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      onClick={() => sounds.navigate()}
      className={`label-caps group relative flex shrink-0 items-center gap-1 px-2 py-2 transition-colors ${
        active
          ? 'bg-black text-white'
          : 'text-black/55 hover:text-black hover:bg-black/5'
      }`}
      style={{ fontSize: '0.62rem' }}
    >
      {icon}
      <span>{label}</span>
      <span className="absolute inset-x-1 bottom-0 h-px origin-left scale-x-0 bg-[var(--ink)] transition-transform duration-200 group-hover:scale-x-100" />
    </Link>
  );
}
