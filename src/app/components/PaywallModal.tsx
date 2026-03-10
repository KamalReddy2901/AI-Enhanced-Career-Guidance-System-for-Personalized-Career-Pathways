import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Zap, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUsage } from '../context/UsageContext';

// Razorpay Checkout SDK type
declare global {
  interface Window {
    Razorpay: new (options: RzpOptions) => { open(): void };
  }
}
interface RzpOptions {
  key: string; order_id: string; amount: number; currency: string;
  name: string; description: string;
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill?: { email?: string }; theme?: { color?: string };
  modal?: { ondismiss?: () => void };
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

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
  creditDetail?: {
    creditsRemaining: number;
    creditCost: number;
    plan: string;
  };
}

const PACKS = [
  { label: '30 Credits', price: '₹59', originalPrice: '₹99', credits: 30, packId: 'pack_30', tag: 'Starter', askAiDays: 7 },
  { label: '75 Credits', price: '₹129', originalPrice: '₹249', credits: 75, packId: 'pack_75', tag: 'Popular', highlight: true, askAiDays: 15 },
  { label: '120 Credits', price: '₹199', originalPrice: '₹399', credits: 120, packId: 'pack_120', tag: 'Best Value', askAiDays: 30 },
];

export function PaywallModal({ open, onClose, featureName, creditDetail }: PaywallModalProps) {
  const [showWhy, setShowWhy] = useState(false);
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
        key: orderData.keyId!,
        order_id: orderData.orderId,
        amount: orderData.amount!,
        currency: 'INR',
        name: 'CareerCase',
        description: orderData.label ?? 'Credit Pack',
        handler: async (response) => {
          const verifyResp = await fetch(`${workerUrl}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ ...response, type: 'pack', packId }),
          });
          const result = await verifyResp.json() as { success?: boolean };
          if (result.success) {
            toast.success('Credits added! Enjoy your Ask AI perk too.');
            refreshCredits();
            onClose();
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

  const featureLabel = featureName
    ? featureName.charAt(0).toUpperCase() + featureName.slice(1)
    : 'This feature';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-border/60">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary fill-primary" />
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                Out of Credits
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold mt-2">
              {`Not enough credits for ${featureLabel}`}
            </DialogTitle>
            {creditDetail ? (
              <p className="text-sm text-muted-foreground mt-1">
                You have <span className="font-semibold text-foreground">{creditDetail.creditsRemaining}</span> credit{creditDetail.creditsRemaining !== 1 ? 's' : ''} remaining.{' '}
                {featureLabel} costs <span className="font-semibold text-foreground">{creditDetail.creditCost}</span> credit{creditDetail.creditCost !== 1 ? 's' : ''}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Top up your credits to continue exploring careers.
              </p>
            )}
          </DialogHeader>
        </div>

        {/* Credit Packs */}
        <div className="px-6 py-4">
          <p className="text-xs text-muted-foreground mb-3">Credits never expire. Each pack includes an <span className="font-semibold text-foreground">Unlimited Ask AI perk</span> for a limited period.</p>
          <div className="space-y-2.5">
            {PACKS.map(pack => (
              <button
                key={pack.packId}
                disabled={isPaymentLoading}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed ${pack.highlight ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-muted/30 hover:bg-muted/60'}`}
                onClick={() => handleRazorpay(pack.packId)}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{pack.label}</span>
                    <Badge variant={pack.highlight ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5">{pack.tag}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground line-through">{pack.originalPrice}</span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                      <Sparkles className="w-3 h-3" />
                      {pack.askAiDays} days unlimited Ask AI
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end ml-3">
                  <span className="font-bold text-primary text-lg">{pack.price}</span>
                  {isPaymentLoading && <Loader2 className="w-3 h-3 animate-spin mt-1 text-muted-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Why is this paid? */}
        <div className="px-6 pb-5">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={() => setShowWhy(v => !v)}
          >
            {showWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Why is this paid?
          </button>
          {showWhy && (
            <div className="mt-2 text-xs text-muted-foreground leading-relaxed border-l-2 border-muted pl-3 space-y-1.5">
              <p>Every AI response costs real money — generating a career dossier makes multiple large AI calls that add up quickly at scale.</p>
              <p>Your 20 free credits cover genuine exploration. Paid credits keep us sustainably running a service that helps you make real career decisions.</p>
              <p>We don't sell your data. Revenue comes only from credit packs.</p>
              <p className="text-foreground/60 font-medium">CareerCase is built by a tiny team. Your support keeps it alive and improving.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

