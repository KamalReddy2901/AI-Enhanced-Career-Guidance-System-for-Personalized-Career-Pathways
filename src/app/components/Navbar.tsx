import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Home, Sparkles, FlaskConical, Scale, Settings, Brain, Sun, Moon, Menu, X, Map, ArrowLeftRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useApp } from '../context/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { StickFigure } from './StickFigure';

export function Navbar() {
  const location = useLocation();
  const { history, isAIEnabled } = useApp();
  const { favorites } = useFavorites();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isHome = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';

  const historyCount = history.length + favorites.length;

  // Avoid hydration mismatch for theme icon
  useEffect(() => setMounted(true), []);

  // Close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const isDark = resolvedTheme === 'dark';

  // Don't show nav items on auth page
  if (isAuthPage) return null;

  const navLinks = [
    { to: '/', icon: <Home size={14} />, label: 'Home', active: isHome },
    ...(isAIEnabled ? [
      { to: '/quiz', icon: <FlaskConical size={14} />, label: 'Quiz', active: location.pathname === '/quiz' },
      { to: '/mood', icon: <Brain size={14} />, label: 'Mood', active: location.pathname === '/mood' },
      { to: '/career-transition', icon: <ArrowLeftRight size={14} />, label: 'Transition', active: location.pathname === '/career-transition' },
      { to: '/roadmap', icon: <Map size={14} />, label: 'Roadmap', active: location.pathname === '/roadmap' },
    ] : []),
    { to: '/compare', icon: <Scale size={14} />, label: 'Compare', active: location.pathname === '/compare' },
    {
      to: '/history',
      icon: <Clock size={14} />,
      label: historyCount > 0 ? `History (${historyCount})` : 'History',
      active: location.pathname === '/history' || location.pathname === '/favorites',
    },
    { to: '/settings', icon: <Settings size={14} />, label: 'Settings', active: location.pathname === '/settings' },
  ];

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-[#f9f8f7]/92 dark:bg-[#161614]/92 backdrop-blur-md border-b border-black/8 dark:border-white/8"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0" aria-label="Career Simulation home">
            <StickFigure pose="standing" size={26} animate={false} />
            <span
              className="font-[Playfair_Display] tracking-tight text-black dark:text-white group-hover:opacity-70 transition-opacity"
              style={{ fontSize: '1.05rem' }}
            >
              Career<span className="opacity-35">Sim</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5 sm:gap-1">
            {navLinks.map(link => (
              <NavLink key={link.to} {...link} />
            ))}

            {/* AI badge */}
            {isAIEnabled && (
              <div
                className="ml-1 flex items-center gap-1 px-2 py-1 bg-black/3 dark:bg-white/5 text-black/25 dark:text-white/25"
                style={{ fontSize: '0.6rem' }}
              >
                <Sparkles size={9} />
                <span className="font-[Inter]">AI on</span>
              </div>
            )}

            {/* Dark mode toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="ml-1 p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
          </div>

          {/* Mobile: dark toggle + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden sm:block absolute right-6 -bottom-5 pointer-events-none">
          <span className="font-[JetBrains_Mono] text-black/12 dark:text-white/12" style={{ fontSize: '0.52rem' }}>
            Ctrl+K search · Esc back
          </span>
        </div>
      </motion.nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed top-14 left-0 right-0 z-40 bg-[#f9f8f7]/98 dark:bg-[#161614]/98 backdrop-blur-md border-b border-black/8 dark:border-white/8 shadow-lg md:hidden"
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
                  className={`flex items-center gap-3 px-4 py-3 font-[Inter] transition-all ${
                    link.active
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
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
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 transition-all font-[Inter] ${
        active
          ? 'bg-black dark:bg-white text-white dark:text-black'
          : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
      }`}
      style={{ fontSize: '0.78rem' }}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
