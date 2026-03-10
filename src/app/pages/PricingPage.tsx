import { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Zap, Gift, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useUsage } from '../context/UsageContext';

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

const PACKS = [
  {
    label: '30 Credits',
    price: '₹59',
    original: '₹99',
    tag: 'Starter',
    packId: 'pack_30',
    highlight: false,
    askAiDays: 7,
    desc: 'Good for ~10 dossiers or 6 simulations.',
  },
  {
    label: '75 Credits',
    price: '₹129',
    original: '₹249',
    tag: 'Popular',
    packId: 'pack_75',
    highlight: true,
    askAiDays: 15,
    desc: 'Great for a deep-dive research session.',
  },
  {
    label: '120 Credits',
    price: '₹199',
    original: '₹399',
    tag: 'Best Value',
    packId: 'pack_120',
    highlight: false,
    askAiDays: 30,
    desc: 'Power users. Credits never expire.',
  },
];

const CREDIT_COSTS = [
  { feature: 'Career Dossier', cost: 3 },
  { feature: 'Career Comparison', cost: 2 },
  { feature: 'Career Transition', cost: 2 },
  { feature: 'Career Roadmap', cost: 2 },
  { feature: 'Day-in-Life Simulation', cost: 5 },
  { feature: 'Interview Prep', cost: 1 },
  { feature: 'Good / Bad / Ugly', cost: 0 },
  { feature: 'AI Chat message', cost: 1 },
  { feature: 'PDF Export', cost: 0 },
  { feature: 'Career Quiz', cost: 0 },
  { feature: 'Mood Match', cost: 0 },
];

const FAQ = [
  {
    q: 'How do credits work?',
    a: 'Every AI-powered action costs a set number of credits. A career dossier costs 3, a simulation costs 5, comparisons/transitions/roadmaps cost 2, and interview prep costs 1. Quiz, Mood Match, Good/Bad/Ugly, and PDF Export are always free.',
  },
  {
    q: 'Do credits expire?',
    a: 'No. Credits you buy never expire. Use them whenever you want.',
  },
  {
    q: 'What is the Unlimited Ask AI perk?',
    a: 'When you buy a credit pack, you get free unlimited Ask AI chat for 7, 15, or 30 days depending on the pack. After the perk period ends, Ask AI costs 1 credit per question.',
  },
  {
    q: 'Can I stack Ask AI perk periods?',
    a: 'Yes! If you buy another pack while your perk is still active, the time extends — your current remaining days are preserved and the new perk days are added on top.',
  },
  {
    q: 'Is there a daily Ask AI limit during the perk?',
    a: 'Yes — to prevent abuse and keep the servers fast, there is a cap of 50 questions per day during the perk period. You will see a "servers are busy" message if you hit it; it resets at midnight UTC.',
  },
  {
    q: 'Is my data sold?',
    a: "No. We only make money from credit packs. We don't use your data for ads or sell it to third parties.",
  },
  {
    q: 'Why is this not fully free?',
    a: 'Every AI response costs real money at scale. The 20 free credits let you properly explore before deciding. Paid packs keep the service alive.',
  },
];

export function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const { session } = useAuth();
  const { refreshCredits } = useUsage();

  async function handleRazorpay(packId: string) {
    if (!session) { window.location.href = '/auth'; return; }
    const workerUrl = import.meta.env.VITE_AI_PROXY_URL as string;
    if (!workerUrl) { toast.error('Payments not available in dev mode.'); return; }
    setIsPaymentLoading(true);
    try {
      const orderResp = await fetch(`${workerUrl}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: 'pack', packId }),
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
        description: orderData.label ?? 'Credit Pack',
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyResp = await fetch(`${workerUrl}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ ...response, type: 'pack', packId }),
          });
          const result = await verifyResp.json() as { success?: boolean };
          if (result.success) {
            toast.success('Credits added! Your Ask AI perk is now active.');
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

        {/* Hero */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-[Playfair_Display] text-4xl sm:text-5xl text-black mb-4">
            Pay only for what you explore.
          </h1>
          <p className="font-[Inter] text-black/50 max-w-lg mx-auto" style={{ fontSize: '0.95rem' }}>
            No subscriptions. Credits never expire. Every pack includes an{' '}
            <span className="text-black/70 font-medium">Unlimited Ask AI</span> perk.
          </p>
        </motion.div>

        {/* Free tier strip */}
        <motion.div
          className="border border-black/10 rounded-xl px-6 py-4 flex items-center justify-between mb-8 bg-black/[0.02]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div>
            <span className="font-[Playfair_Display] text-lg text-black">Free</span>
            <p className="font-[Inter] text-black/45 text-xs mt-0.5">20 credits on signup — no card needed</p>
          </div>
          <Badge variant="secondary" className="font-[Inter] text-xs">Your starting plan</Badge>
        </motion.div>

        {/* Credit Packs */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {PACKS.map(pack => (
              <div
                key={pack.packId}
                className={`rounded-xl border p-6 relative flex flex-col ${pack.highlight ? 'border-black bg-black/[0.03]' : 'border-black/15'}`}
              >
                {pack.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs font-[Inter]">Most Popular</Badge>
                  </div>
                )}
                <div className="mb-4 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-[Playfair_Display] text-xl text-black">{pack.label}</h3>
                    <Badge variant="secondary" className="text-[10px] font-[Inter] py-0">{pack.tag}</Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-black">{pack.price}</span>
                    <span className="text-black/30 line-through text-sm font-[Inter]">{pack.original}</span>
                  </div>
                  <p className="font-[Inter] text-black/40 text-xs mt-1.5">{pack.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-amber-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="font-[Inter] text-xs font-medium">{pack.askAiDays} days unlimited Ask AI</span>
                  </div>
                </div>
                <Button
                  variant={pack.highlight ? 'default' : 'outline'}
                  className="w-full text-sm mt-auto"
                  disabled={isPaymentLoading}
                  onClick={() => handleRazorpay(pack.packId)}
                >
                  {isPaymentLoading
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <Gift className="w-3.5 h-3.5 mr-1.5" />}
                  Buy {pack.label}
                </Button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* What is Unlimited Ask AI */}
        <motion.div
          className="mb-16 border border-amber-500/25 rounded-xl px-6 py-5 bg-amber-50/40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-[Playfair_Display] text-lg text-black mb-1">What is the Unlimited Ask AI perk?</h3>
              <p className="font-[Inter] text-black/55 text-sm leading-relaxed">
                Every credit pack activates a limited-time window where the AI chat on every career page is completely free — no credits deducted per question. Ask as much as you want.{' '}
                <span className="text-black/70 font-medium">Packs stack:</span> buying again while your perk is active extends the timer. There is a soft cap of 50 questions/day to keep the servers fast for everyone.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Credit Cost Breakdown */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
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
          transition={{ delay: 0.22 }}
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
          transition={{ delay: 0.28 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/3 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-black/30" />
            <span className="font-[Inter] text-black/40 text-xs">Payments secured by Razorpay — UPI, cards, netbanking accepted</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
