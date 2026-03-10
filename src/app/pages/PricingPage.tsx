import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Check, Zap, Gift, Star, Lock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useUsage } from '../context/UsageContext';

// Reuse the Razorpay type declared in PaywallModal (global Window)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(s);
  });
}

const FREE_FEATURES = [
  '30 credits on signup (one-time)',
  'Career Quiz (free)',
  'Mood Match (free)',
  'All core AI features included',
  'Buy credit packs anytime',
];

const PRO_FEATURES = [
  'Unlimited credits',
  'Ask AI chat (Pro exclusive)',
  'PDF Export (Pro exclusive)',
  'Priority support',
  'All free features',
];

const CREDIT_COSTS = [
  { feature: 'Career Dossier', cost: 3 },
  { feature: 'Career Comparison', cost: 2 },
  { feature: 'Career Transition', cost: 2 },
  { feature: 'Career Roadmap', cost: 2 },
  { feature: 'Day-in-Life Simulation', cost: 1 },
  { feature: 'Interview Prep', cost: 1 },
  { feature: 'Good/Bad/Ugly', cost: 1 },
  { feature: 'AI Chat message', cost: 1 },
  { feature: 'Career Quiz', cost: 0 },
  { feature: 'Mood Match', cost: 0 },
];

const PACKS = [
  { label: '30 Credits',  price: '₹59',  original: '₹99',  tag: 'Try it out',  packId: 'pack_30',  highlight: false, desc: 'Good for about 10 dossiers or 6 simulations.' },
  { label: '75 Credits',  price: '₹129', original: '₹249', tag: 'Most Popular', packId: 'pack_75',  highlight: true,  desc: 'Great for a deep-dive research session.' },
  { label: '150 Credits', price: '₹199', original: '₹399', tag: 'Best Value',   packId: 'pack_150', highlight: false, desc: 'Power users. Credits never expire.' },
];

const FAQ = [
  {
    q: 'How do credits work?',
    a: 'Every AI-powered action costs a set number of credits. A career dossier costs 3, a full simulation session costs 5, and comparisons/transitions/roadmaps cost 2 each. Quiz and Mood Match are always free.',
  },
  {
    q: 'Do credits expire?',
    a: 'No. Credits from packs or the free signup bonus never expire. Use them whenever you want.',
  },
  {
    q: 'What does the Pro daily limit mean?',
    a: 'Pro gives you 100 credits every day that reset at midnight UTC. That’s enough for 20 dossiers or 20 simulations per day — far more than most users will ever need.',
  },
  {
    q: 'What features are Pro-only?',
    a: 'Ask AI (inline chat) and PDF Export are exclusive to Pro subscribers. Everything else works with credits.',
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
    a: "Every AI response costs real money at scale. The 20 free credits are enough to properly explore careers before deciding. Paid plans keep the service alive.",
  },
];

export function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const { session } = useAuth();
  const { refreshCredits } = useUsage();

  async function handleRazorpay(type: 'pro' | 'pack', packId?: string) {
    if (!session) { window.location.href = '/auth'; return; }
    const workerUrl = import.meta.env.VITE_AI_PROXY_URL as string;
    if (!workerUrl) { toast.error('Payments not available in dev mode.'); return; }
    setIsPaymentLoading(true);
    try {
      const orderResp = await fetch(`${workerUrl}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ type, packId }),
      });
      const orderData = await orderResp.json() as { orderId?: string; amount?: number; keyId?: string; label?: string; error?: string };
      if (!orderResp.ok || !orderData.orderId) {
        toast.error(orderData.error ?? 'Could not initiate payment. Try again.');
        return;
      }
      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'CareerCase',
        description: type === 'pro' ? 'Pro Plan — 30 Days' : (orderData.label ?? 'Credit Pack'),
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyResp = await fetch(`${workerUrl}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ ...response, type, packId }),
          });
          const result = await verifyResp.json() as { success?: boolean };
          if (result.success) {
            toast.success(type === 'pro' ? 'Pro activated! Enjoy 100 credits/day.' : 'Credits added to your account.');
            refreshCredits();
          } else {
            toast.error('Payment verification failed. Contact support if credits were deducted.');
          }
        },
        prefill: { email: session.user.email ?? undefined },
        theme: { color: '#030213' },
        modal: { ondismiss: () => setIsPaymentLoading(false) },
      });
      rzp.open();
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsPaymentLoading(false);
    }
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
            Start with 20 free credits. Pay when you need more. No subscriptions required — top up with credit packs anytime.
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
              <p className="font-[Inter] text-black/40 text-sm mt-2">No credit card. 20 credits on us.</p>
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
                Early Bird — 50% off
              </Badge>
            </div>
            <div className="mb-6">
              <h2 className="font-[Playfair_Display] text-2xl text-black mb-1">Pro</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-black">₹249</span>
                <span className="text-black/40 font-[Inter] text-sm">/month</span>
                <span className="text-black/30 line-through font-[Inter] text-sm ml-1">₹499</span>
              </div>
              <p className="font-[Inter] text-black/40 text-sm mt-2">Cancel anytime. 100 credits/day.</p>
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
              <Button className="w-full font-semibold" disabled={isPaymentLoading} onClick={() => handleRazorpay('pro')}>
              {isPaymentLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Upgrade to Pro — ₹249/month
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
                  disabled={isPaymentLoading}
                  onClick={() => handleRazorpay('pack', pack.packId)}
                >
                  {isPaymentLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Gift className="w-3.5 h-3.5 mr-1.5" />}
                  Buy {pack.label}
                </Button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Credit Cost Breakdown */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <div className="text-center mb-8">
            <h2 className="font-[Playfair_Display] text-3xl text-black mb-2">Credit Costs</h2>
            <p className="font-[Inter] text-black/50 text-sm">How many credits each feature uses</p>
          </div>
          <div className="max-w-md mx-auto border border-black/10 rounded-xl overflow-hidden">
            {CREDIT_COSTS.map((item, i) => (
              <div
                key={item.feature}
                className={`flex items-center justify-between px-5 py-3 font-[Inter] text-sm ${i !== CREDIT_COSTS.length - 1 ? 'border-b border-black/8' : ''}`}
              >
                <span className="text-black/70">{item.feature}</span>
                <span className="flex items-center gap-1 text-black font-medium">
                  {item.cost === 0 ? (
                    <span className="text-black/40">Free</span>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      {item.cost}
                    </>
                  )}
                </span>
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
