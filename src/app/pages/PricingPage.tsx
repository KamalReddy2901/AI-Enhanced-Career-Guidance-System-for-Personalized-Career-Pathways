import { motion } from 'motion/react';
import { ArrowRight, KeyRound, ShieldCheck, Sparkles, Workflow, Orbit } from 'lucide-react';
import { Link } from 'react-router';

const HIGHLIGHTS = [
  {
    title: 'No credits, no meter',
    text: 'Every feature stays available. There is no balance to watch, no top-ups, and no paywall modal.',
    icon: Sparkles,
  },
  {
    title: 'API key rotation stays on',
    text: 'The worker still cycles through Groq keys and backs off exhausted keys automatically, so traffic stays resilient.',
    icon: KeyRound,
  },
  {
    title: 'Everything is included',
    text: 'Dossiers, comparisons, roadmaps, simulations, quiz flows, and Ask AI all remain part of the same app.',
    icon: Workflow,
  },
];

const FLOW = [
  'Your request goes to the worker.',
  'The worker picks the next healthy Groq key.',
  'If a key is rate-limited, it cools down and the worker retries another one.',
  'No credits are deducted at any point.',
];

export function PricingPage() {
  return (
    <div className="editorial-utility min-h-screen bg-[var(--paper)] pt-20 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 bg-black/[0.02] mb-5">
            <Orbit className="w-3.5 h-3.5 text-black/40" />
            <span className="font-[Inter] text-black/45 uppercase tracking-[0.14em]" style={{ fontSize: '0.62rem' }}>
              Access
            </span>
          </div>
          <h1 className="font-[Playfair_Display] text-black leading-tight mb-4" style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
            Everything is included.
          </h1>
          <p className="font-[Inter] text-black/50 max-w-2xl mx-auto" style={{ fontSize: '0.98rem', lineHeight: 1.7 }}>
            CareerCase no longer uses credits, subscriptions, or purchase packs. The app simply routes AI work through a resilient worker that rotates API keys behind the scenes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-14">
          {HIGHLIGHTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                className="border border-black/10 bg-white rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.03)]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="w-11 h-11 rounded-xl bg-black/[0.04] border border-black/8 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-black/70" />
                </div>
                <h2 className="font-[Playfair_Display] text-xl text-black mb-2">{item.title}</h2>
                <p className="font-[Inter] text-black/45" style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
                  {item.text}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start mb-14">
          <motion.div
            className="border border-black/10 rounded-3xl p-7 bg-[#fbfaf8]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-black/40" />
              <h2 className="font-[Playfair_Display] text-2xl text-black">How requests flow</h2>
            </div>
            <div className="space-y-3">
              {FLOW.map((step, index) => (
                <div key={step} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 font-[Inter]" style={{ fontSize: '0.72rem' }}>
                    {index + 1}
                  </div>
                  <p className="font-[Inter] text-black/55" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="border border-black/10 rounded-3xl p-7 bg-black text-white"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="font-[Playfair_Display] text-2xl mb-3">What changed</h2>
            <div className="space-y-3 font-[Inter] text-white/75" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
              <p>There is no billing screen anymore.</p>
              <p>There is no credit balance to manage.</p>
              <p>The UI now focuses on the actual career tools instead of monetization.</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-white text-black font-[Inter] transition-transform hover:translate-x-0.5"
              style={{ fontSize: '0.86rem' }}
            >
              Go to CareerCase
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="border border-black/10 rounded-2xl p-5 bg-black/[0.02] text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-[Inter] text-black/50" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
            If you are seeing this page from an old bookmark, it now serves as a simple access note instead of a pricing table.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
