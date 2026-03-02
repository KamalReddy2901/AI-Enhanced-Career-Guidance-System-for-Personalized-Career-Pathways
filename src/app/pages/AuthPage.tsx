import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, loading } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const redirect = searchParams.get('redirect') ?? '/';

  // Already logged in — redirect
  useEffect(() => {
    if (!loading && user) {
      navigate(redirect, { replace: true });
    }
  }, [user, loading, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsSubmitting(true);

    if (mode === 'signup') {
      const { error } = await signUp(email.trim(), password);
      if (error) {
        toast.error(error);
      } else {
        setSignUpSuccess(true);
      }
    } else {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Welcome back!');
        navigate(redirect, { replace: true });
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-black/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top strip */}
      <div className="border-b border-black/8 py-4 px-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group"
        >
          <StickFigure pose="standing" size={22} animate={false} />
          <span className="font-[Playfair_Display] text-black tracking-tight group-hover:opacity-70 transition-opacity" style={{ fontSize: '1rem' }}>
            Career<span className="opacity-35">Sim</span>
          </span>
        </button>
        <span className="font-[JetBrains_Mono] text-black/20 hidden sm:block" style={{ fontSize: '0.6rem' }}>
          Powered by Groq · Llama 3.3
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {signUpSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <StickFigure pose="celebrating" size={100} className="mx-auto mb-6" />
                <h1 className="font-[Playfair_Display] text-black mb-3" style={{ fontSize: '1.8rem' }}>
                  Check your email
                </h1>
                <p className="font-[Inter] text-black/50 leading-relaxed" style={{ fontSize: '0.9rem' }}>
                  We've sent a confirmation link to <strong className="text-black">{email}</strong>.
                  Click it to verify your account, then sign in.
                </p>
                <button
                  onClick={() => { setSignUpSuccess(false); setMode('signin'); }}
                  className="mt-8 font-[Inter] text-black/40 hover:text-black/70 transition-colors underline underline-offset-2"
                  style={{ fontSize: '0.85rem' }}
                >
                  Back to sign in
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Header */}
                <div className="text-center mb-10">
                  <StickFigure
                    pose={mode === 'signup' ? 'waving' : 'presenting'}
                    size={72}
                    className="mx-auto mb-5"
                  />
                  <h1 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '2rem' }}>
                    {mode === 'signup' ? 'Get Started for Free' : 'Welcome Back'}
                  </h1>
                  <p className="font-[Inter] text-black/40 leading-relaxed" style={{ fontSize: '0.875rem' }}>
                    {mode === 'signup'
                      ? 'Create an account to save your career history across devices.'
                      : 'Sign in to access your synced career history.'}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block font-[Inter] text-black/50 mb-1.5 uppercase tracking-[0.1em]" style={{ fontSize: '0.65rem' }}>
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 border-2 border-black/12 font-[Inter] text-black placeholder:text-black/20 focus:outline-none focus:border-black/40 transition-colors bg-white"
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-[Inter] text-black/50 mb-1.5 uppercase tracking-[0.1em]" style={{ fontSize: '0.65rem' }}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/25" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                        className="w-full pl-10 pr-10 py-3 border-2 border-black/12 font-[Inter] text-black placeholder:text-black/20 focus:outline-none focus:border-black/40 transition-colors bg-white"
                        style={{ fontSize: '0.9rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/50 transition-colors"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || !password.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 font-[Inter] hover:bg-black/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                    style={{ fontSize: '0.9rem' }}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        {mode === 'signup' ? 'Create Account' : 'Sign In'}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Toggle mode */}
                <div className="mt-6 text-center">
                  <span className="font-[Inter] text-black/35" style={{ fontSize: '0.85rem' }}>
                    {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                  </span>{' '}
                  <button
                    onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                    className="font-[Inter] text-black/60 hover:text-black transition-colors underline underline-offset-2"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {mode === 'signup' ? 'Sign in' : 'Get started for free'}
                  </button>
                </div>

                {/* Features reminder */}
                <div className="mt-10 border border-black/8 p-5">
                  <p className="font-[Inter] text-black/30 uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5" style={{ fontSize: '0.6rem' }}>
                    <Sparkles size={10} />
                    What you get
                  </p>
                  <ul className="space-y-2 font-[Inter] text-black/45" style={{ fontSize: '0.82rem' }}>
                    <li className="flex items-start gap-2">
                      <span className="text-black/25 mt-0.5">—</span>
                      History synced across all your devices
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black/25 mt-0.5">—</span>
                      Full AI career dossiers, simulations & interview prep
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black/25 mt-0.5">—</span>
                      Completely free, no credit card required
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
