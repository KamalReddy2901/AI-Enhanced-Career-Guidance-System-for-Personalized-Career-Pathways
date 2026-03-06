import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Gift, Star, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const FREE_FEATURES = [
  '3 Career Dossiers/day',
  '1 Simulation/day',
  '5 AI Chat messages/day',
  '1 Career Comparison/day',
  '1 Career Transition plan/day',
  '1 Career Roadmap/day',
  'Career Quiz (unlimited)',
  'Mood Match (unlimited)',
];

const PRO_FEATURES = [
  '15 Career Dossiers/day',
  '5 Simulations/day',
  '50 AI Chat messages/day',
  '5 Career Comparisons/day',
  '5 Career Transitions/day',
  '5 Career Roadmaps/day',
  'PDF Export',
  'Priority support',
  'All free features',
];

const PACKS = [
  {
    label: '5 Credits',
    price: '₹29',
    original: '₹49',
    tag: 'Try it out',
    packId: 'pack_5',
    desc: 'Use for any premium feature — dossiers, simulations, transitions.',
  },
  {
    label: '20 Credits',
    price: '₹99',
    original: '₹199',
    tag: 'Most Popular',
    packId: 'pack_20',
    highlight: true,
    desc: 'Great for a deep-dive research session.',
  },
  {
    label: '50 Credits',
    price: '₹199',
    original: '₹499',
    tag: 'Best Value',
    packId: 'pack_50',
    desc: 'Power users. Credits never expire.',
  },
];

const FAQ = [
  {
    q: 'Do credits expire?',
    a: 'No. One-time pack credits never expire. Use them whenever you want.',
  },
  {
    q: 'What counts as one credit?',
    a: 'Each premium AI call uses one credit from your pack — generating a dossier, running a simulation, a career transition plan, etc. Chat messages from packs use 1 credit per 5 messages.',
  },
  {
    q: 'Can I cancel Pro anytime?',
    a: 'Yes. Your Pro access continues until the end of the billing period. No questions asked.',
  },
  {
    q: 'Is my data sold?',
    a: "No. We only make money from subscriptions and packs. We don't use your data for ads or sell it to third parties.",
  },
  {
    q: 'Why is this not fully free?',
    a: "Every AI response costs real money at scale. The free tier is generous enough for casual exploration. Paid plans keep the service alive and improving — we're a tiny team.",
  },
];

export function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleRazorpay(type: 'pro' | 'pack', packId?: string) {
    void type; void packId;
    alert("Payment integration coming soon! Until then, enjoy the generous free tier.");
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Badge variant="secondary" className="mb-4 text-xs">Early Bird Pricing</Badge>
          <h1 className="font-[Playfair_Display] text-4xl sm:text-5xl text-black mb-4">
            Simple, honest pricing
          </h1>
          <p className="font-[Inter] text-black/50 max-w-lg mx-auto" style={{ fontSize: '0.95rem' }}>
            Free to explore. Pay when you need more. No subscriptions required — top up with credits anytime.
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Free */}
          <motion.div
            className="border border-black/12 rounded-2xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-6">
              <h2 className="font-[Playfair_Display] text-2xl text-black mb-1">Free</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-black">₹0</span>
                <span className="text-black/40 font-[Inter] text-sm">/forever</span>
              </div>
              <p className="font-[Inter] text-black/40 text-sm mt-2">No credit card. No tricks.</p>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 font-[Inter] text-sm text-black/70">
                  <Check className="w-4 h-4 text-black/40 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Current plan
            </Button>
          </motion.div>

          {/* Pro */}
          <motion.div
            className="border-2 border-black rounded-2xl p-8 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="absolute top-4 right-4">
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs">
                <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                Early Bird — 60% off
              </Badge>
            </div>
            <div className="mb-6">
              <h2 className="font-[Playfair_Display] text-2xl text-black mb-1">Pro</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-black">₹59</span>
                <span className="text-black/40 font-[Inter] text-sm">/month</span>
                <span className="text-black/30 line-through font-[Inter] text-sm ml-1">₹149</span>
              </div>
              <p className="font-[Inter] text-black/40 text-sm mt-2">Cancel anytime.</p>
            </div>
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 font-[Inter] text-sm text-black/80">
                  <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full font-semibold" onClick={() => handleRazorpay('pro')}>
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to Pro — ₹59/month
            </Button>
          </motion.div>
        </div>

        {/* One-time packs */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center mb-8">
            <h2 className="font-[Playfair_Display] text-3xl text-black mb-2">One-time Credit Packs</h2>
            <p className="font-[Inter] text-black/50 text-sm">No subscription. Credits never expire. Use for any premium feature.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {PACKS.map(pack => (
              <div
                key={pack.packId}
                className={`rounded-xl border p-6 relative ${pack.highlight ? 'border-black bg-black/3' : 'border-black/15'}`}
              >
                {pack.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs">Most Popular</Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-[Playfair_Display] text-xl text-black mb-1">{pack.label}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-black">{pack.price}</span>
                    <span className="text-black/30 line-through text-sm">{pack.original}</span>
                  </div>
                  <p className="font-[Inter] text-black/40 text-xs mt-1.5">{pack.desc}</p>
                </div>
                <Button
                  variant={pack.highlight ? 'default' : 'outline'}
                  className="w-full text-sm"
                  onClick={() => handleRazorpay('pack', pack.packId)}
                >
                  <Gift className="w-3.5 h-3.5 mr-1.5" />
                  Buy {pack.label}
                </Button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="font-[Playfair_Display] text-3xl text-black mb-8 text-center">FAQ</h2>
          <div className="space-y-2 max-w-2xl mx-auto">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-black/10 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 font-[Inter] text-sm text-black/80 hover:text-black transition-colors text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span className="ml-4 text-black/30 flex-shrink-0">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 font-[Inter] text-sm text-black/55 leading-relaxed border-t border-black/8 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/3 rounded-full">
            <Lock className="w-3.5 h-3.5 text-black/30" />
            <span className="font-[Inter] text-black/40 text-xs">Payments secured by Razorpay — UPI, cards, netbanking accepted</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
