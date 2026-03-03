import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Clock, Home, Sparkles, FlaskConical, Scale, Settings, Brain } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { StickFigure } from './StickFigure';

export function Navbar() {
  const location = useLocation();
  const { history, isAIEnabled } = useApp();
  const { favorites } = useFavorites();
  const isHome = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';

  const historyCount = history.length + favorites.length;

  // Don't show nav items on auth page
  if (isAuthPage) return null;

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#f5ede0]/92 backdrop-blur-md border-b border-black/8"
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <StickFigure pose="standing" size={26} animate={false} />
          <span
            className="font-[Playfair_Display] tracking-tight text-black group-hover:opacity-70 transition-opacity"
            style={{ fontSize: '1.05rem' }}
          >
            Career<span className="opacity-35">Sim</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <NavLink to="/" icon={<Home size={14} />} label="Home" active={isHome} />

          {isAIEnabled && (
            <>
              <NavLink
                to="/quiz"
                icon={<FlaskConical size={14} />}
                label="Quiz"
                active={location.pathname === '/quiz'}
              />
              <NavLink
                to="/mood"
                icon={<Brain size={14} />}
                label="Mood"
                active={location.pathname === '/mood'}
              />
            </>
          )}

          <NavLink
            to="/compare"
            icon={<Scale size={14} />}
            label="Compare"
            active={location.pathname === '/compare'}
          />

          <NavLink
            to="/history"
            icon={<Clock size={14} />}
            label={historyCount > 0 ? `History (${historyCount})` : 'History'}
            active={location.pathname === '/history' || location.pathname === '/favorites'}
          />

          <NavLink
            to="/settings"
            icon={<Settings size={14} />}
            label="Settings"
            active={location.pathname === '/settings'}
          />

          {/* AI badge */}
          {isAIEnabled && (
            <div
              className="ml-1 hidden lg:flex items-center gap-1 px-2 py-1 bg-black/3 text-black/25"
              style={{ fontSize: '0.6rem' }}
            >
              <Sparkles size={9} />
              <span className="font-[Inter]">AI on</span>
            </div>
          )}


        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="hidden sm:block absolute right-6 -bottom-5 pointer-events-none">
        <span className="font-[JetBrains_Mono] text-black/12" style={{ fontSize: '0.52rem' }}>
          Ctrl+K search · Esc back
        </span>
      </div>
    </motion.nav>
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
          ? 'bg-black text-white'
          : 'text-black/55 hover:text-black hover:bg-black/5'
      }`}
      style={{ fontSize: '0.78rem' }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

