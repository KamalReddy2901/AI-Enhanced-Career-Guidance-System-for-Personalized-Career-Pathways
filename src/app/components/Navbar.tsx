import { Link, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Clock, Home, Sparkles, FlaskConical, Scale, Settings, Flame, Brain, LogOut, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { useStreak } from '../hooks/useStreak';
import { StickFigure } from './StickFigure';
import { toast } from 'sonner';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { history, isAIEnabled } = useApp();
  const { user, signOut, isSupabaseConfigured } = useAuth();
  const { favorites } = useFavorites();
  const { currentStreak } = useStreak();
  const isHome = location.pathname === '/';
  const isAuthPage = location.pathname === '/auth';

  const historyCount = history.length + favorites.length;

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/');
  };

  // Don't show nav items on auth page
  if (isAuthPage) return null;

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-md border-b border-black/8"
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

          {/* Streak badge */}
          {currentStreak > 0 && (
            <div
              className="hidden lg:flex items-center gap-1 px-2 py-1 border border-black/10 text-black/40 ml-1"
              title={`${currentStreak}-day streak`}
              style={{ fontSize: '0.68rem' }}
            >
              <Flame size={11} className={currentStreak >= 3 ? 'text-black/60' : 'text-black/25'} />
              <span className="font-[JetBrains_Mono]">{currentStreak}d</span>
            </div>
          )}

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

          {/* Auth: user info or Get Started */}
          {isSupabaseConfigured && (
            <div className="ml-2 flex items-center gap-1">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-black/30 font-[Inter]" style={{ fontSize: '0.7rem' }}>
                    <User size={11} />
                    <span className="max-w-[80px] truncate">{user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-black/40 hover:text-black hover:bg-black/5 transition-all font-[Inter]"
                    style={{ fontSize: '0.78rem' }}
                    title="Sign out"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/auth?mode=signup"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white font-[Inter] hover:bg-black/85 transition-colors"
                  style={{ fontSize: '0.78rem' }}
                >
                  Get Started
                </Link>
              )}
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

