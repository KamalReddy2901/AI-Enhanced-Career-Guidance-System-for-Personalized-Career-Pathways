import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Home, Compass, Settings, Menu, X, Map, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { sounds } from '../utils/sounds';
import { LanguageSwitcher, useT } from '../i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export function Navbar() {
  const { t } = useT();
  const location = useLocation();
  const { history } = useApp();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';

  const historyCount = history.length + favorites.length;

  // Close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Don't show nav items on auth page
  if (isAuthPage) return null;

  const navLinks = [
    { to: '/', icon: <Home size={14} />, label: t('home'), active: isHome },
    { to: '/job', icon: <Compass size={14} />, label: t('explore'), active: ['/job','/quiz','/mood','/compare','/career-transition','/roadmap'].some(path => location.pathname.startsWith(path)) },
    { to: '/passport', icon: <Map size={14} />, label: t('pathways'), active: ['/passport','/assess','/recommendations','/pathway'].some(path => location.pathname.startsWith(path)) },
    { to: '/counselor', icon: <MessageCircle size={14} />, label: t('counselor'), active: location.pathname === '/counselor' },
    ...user ? [
      {
        to: '/history',
        icon: <Clock size={14} />,
        label: historyCount > 0 ? `${t('archive')} (${historyCount})` : t('archive'),
        active: location.pathname === '/history' || location.pathname === '/favorites',
      },
      { to: '/settings', icon: <Settings size={14} />, label: t('settings'), active: location.pathname === '/settings' },
    ] : [{ to: '/settings', icon: <Settings size={14} />, label: t('settings'), active: location.pathname === '/settings' }],
  ];
  const primaryLinks = navLinks.slice(0, 4);
  const overflowLinks = navLinks.slice(4);

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 sm:gap-1">
            {primaryLinks.map(link => (
              <NavLink key={link.to} {...link} />
            ))}
            <LanguageSwitcher compact />
            {overflowLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="label-caps flex items-center gap-1 px-3 py-2" aria-label={t('more')} data-testid="navbar-more-menu">
                    <MoreHorizontal size={16} strokeWidth={1.5} />
                    <span className="hidden lg:inline">{t('more')}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="card-sketch bg-[var(--paper-raised)] p-1">
                  {overflowLinks.map((link) => (
                    <DropdownMenuItem key={link.to} asChild>
                      <Link to={link.to} className="font-mono-ui flex min-h-11 items-center gap-2 px-3 text-xs uppercase tracking-wide">
                        {link.icon}{link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden sm:block absolute right-6 -bottom-5 pointer-events-none">
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
              {navLinks.map(link => (
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
      onClick={() => sounds.navigate()}
      className={`label-caps group relative flex items-center gap-1.5 px-2.5 py-2 transition-colors sm:px-3 ${
        active
          ? 'bg-black text-white'
          : 'text-black/55 hover:text-black hover:bg-black/5'
      }`}
      style={{ fontSize: '0.78rem' }}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      <span className="absolute inset-x-2 bottom-0 h-px origin-left scale-x-0 bg-[var(--ink)] transition-transform duration-200 group-hover:scale-x-100" />
    </Link>
  );
}
