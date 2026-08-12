import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { TextReveal } from '../motion/TextReveal';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithGoogle, user, loading, isSupabaseConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const redirect = searchParams.get('redirect') ?? '/';

  // Already logged in - redirect
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-black/30" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-6"><div className="max-w-md border border-black/10 bg-white p-8"><h1 className="font-display text-3xl">Account service unavailable</h1><p className="mt-3 font-[Inter] text-sm leading-relaxed text-black/60">CareerCase requires its Supabase account service before a journey can begin. Add the public Supabase URL and anon key to the deployment environment, then reload.</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top strip */}
      <div className="border-b border-black/8 py-4 px-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group"
        >
          <StickFigure pose="standing" size={22} animate={false} />
          <span className="font-[Playfair_Display] text-black tracking-tight group-hover:opacity-70 transition-opacity" style={{ fontSize: '1rem' }}>
            Career<span className="opacity-35">Case</span>
          </span>
        </button>
        <span className="font-[JetBrains_Mono] text-black/20 hidden sm:block" style={{ fontSize: '0.6rem' }}>
          AI career exploration
        </span>
      </div>

      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <aside className="hidden border-r-2 border-black pr-12 lg:block"><div className="label-caps">CareerCase account desk</div><h2 className="mt-4 font-[Playfair_Display] text-6xl leading-[.95]">Keep your case file moving.</h2><p className="mt-5 font-[Inter] text-black/55">Save evidence, revisit pathways, and carry your career passport across devices.</p><StickFigure pose="walking" size={150} className="mt-8"/></aside>
        <div className="w-full max-w-sm justify-self-center">
          <AnimatePresence mode="wait">
            {signUpSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <StickFigure pose="celebrating" size={100} className="mx-auto mb-6" />
                <h1 className="font-display text-5xl leading-[1.25] text-black mb-3"><TextReveal text="Check your email" /></h1>
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
                  <h1 className="font-display text-5xl leading-[1.25] text-black mb-2"><TextReveal text={mode === 'signup' ? 'Get Started for Free' : 'Welcome Back'} /></h1>
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

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-black/8" />
                  <span className="font-[Inter] text-black/25 uppercase tracking-[0.1em]" style={{ fontSize: '0.62rem' }}>or</span>
                  <div className="flex-1 h-px bg-black/8" />
                </div>

                {/* Google OAuth */}
                <motion.button
                  type="button"
                  onClick={async () => {
                    const { error } = await signInWithGoogle(redirect);
                    if (error) toast.error(error);
                  }}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 border-2 border-black/12 py-3 font-[Inter] text-black/70 hover:border-black/30 hover:text-black transition-[color,background-color,border-color,opacity,transform,box-shadow] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontSize: '0.9rem' }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                >
                  {/* Google logo SVG */}
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </motion.button>

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
                      <span className="text-black/25 mt-0.5">-</span>
                      History synced across all your devices
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black/25 mt-0.5">-</span>
                      Full AI career dossiers, simulations & interview prep
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-black/25 mt-0.5">-</span>
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
