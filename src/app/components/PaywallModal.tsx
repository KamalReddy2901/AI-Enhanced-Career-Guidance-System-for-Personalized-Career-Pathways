import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Zap, Lock, ChevronDown, ChevronUp, Star, Gift } from 'lucide-react';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  /** The feature that triggered the paywall */
  featureName?: string;
  /** Usage info from QuotaExceededError */
  usageDetail?: {
    used: number;
    limit: number;
    plan: string;
  };
}

const PLANS = {
  pro: {
    label: 'Pro',
    price: '₹59',
    period: '/month',
    originalPrice: '₹149',
    features: [
      '15 Career Dossiers/day',
      '5 Simulations/day',
      '50 AI Chat messages/day',
      '5 Career Transitions/day',
      '5 Career Roadmaps/day',
      'PDF Export',
      'Priority support',
    ],
    earlyBirdTag: 'Early Bird — 60% off',
    razorpayPlanId: '', // set after Razorpay setup
  },
};

const PACKS = [
  { label: '5 Credits', price: '₹29', originalPrice: '₹49', credits: 5, packId: 'pack_5', tag: 'Starter' },
  { label: '20 Credits', price: '₹99', originalPrice: '₹199', credits: 20, packId: 'pack_20', tag: 'Popular', highlight: true },
  { label: '50 Credits', price: '₹199', originalPrice: '₹499', credits: 50, packId: 'pack_50', tag: 'Best Value' },
];

export function PaywallModal({ open, onClose, featureName, usageDetail }: PaywallModalProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [activeTab, setActiveTab] = useState<'pro' | 'pack'>('pro');

  function handleRazorpay(type: 'pro' | 'pack', packId?: string) {
    // Razorpay integration will go here once keys are configured
    // For now, show a coming-soon alert
    alert('Payment setup coming soon! We\'ll notify you when we launch. Until then, enjoy the free tier.');
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
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs font-medium">Free Limit Reached</Badge>
            </div>
            <DialogTitle className="text-xl font-bold mt-2">
              {featureLabel} is at its daily limit
            </DialogTitle>
            {usageDetail && (
              <p className="text-sm text-muted-foreground mt-1">
                You've used {usageDetail.used} of {usageDetail.limit} free {featureLabel.toLowerCase()} today.
                Resets at midnight.
              </p>
            )}
            {!usageDetail && (
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade for more access, or come back tomorrow — your free quota resets at midnight.
              </p>
            )}
          </DialogHeader>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-6 mt-4 mb-0 rounded-xl bg-muted/50 p-1 gap-1">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pro' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('pro')}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
            Pro Plan
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pack' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('pack')}
          >
            <Gift className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
            One-time Packs
          </button>
        </div>

        {/* Pro plan */}
        {activeTab === 'pro' && (
          <div className="px-6 py-4">
            <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30">
                  <Star className="w-2.5 h-2.5 mr-1 fill-amber-500 text-amber-500" />
                  {PLANS.pro.earlyBirdTag}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold">{PLANS.pro.price}</span>
                <span className="text-muted-foreground text-sm">{PLANS.pro.period}</span>
                <span className="text-muted-foreground/60 text-sm line-through ml-1">{PLANS.pro.originalPrice}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {PLANS.pro.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-[10px] font-bold">✓</span>
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full mt-4 font-semibold"
              size="lg"
              onClick={() => handleRazorpay('pro')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to Pro — ₹59/month
            </Button>
          </div>
        )}

        {/* Packs */}
        {activeTab === 'pack' && (
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground mb-3">Credits roll over and never expire. Use for any premium feature.</p>
            <div className="space-y-2.5">
              {PACKS.map(pack => (
                <button
                  key={pack.packId}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${pack.highlight ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-muted/30 hover:bg-muted/60'}`}
                  onClick={() => handleRazorpay('pack', pack.packId)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{pack.label}</span>
                      <Badge variant={pack.highlight ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5">{pack.tag}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground line-through">{pack.originalPrice}</span>
                  </div>
                  <span className="font-bold text-primary text-lg">{pack.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
              <p>The free tier covers casual exploration. Paid plans let us sustainably run a service that helps you make better career decisions.</p>
              <p>We don't sell your data. Revenue comes only from subscriptions and packs.</p>
              <p className="text-foreground/60 font-medium">CareerCase is built by a tiny team. Your support keeps it alive and improving.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
