import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Volume2, VolumeX, Trash2, Check, LogOut, User, LogIn, Download, Smartphone } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { usePreferences } from '../hooks/usePreferences';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { clearAllCache } from '../services/ai';
import { toast } from 'sonner';
import { sounds, enableSound, isSoundOn } from '../utils/sounds';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '../components/ui/alert-dialog';

export function SettingsPage() {
  const navigate = useNavigate();
  const { preferences, setPreferences, resetPreferences } = usePreferences();
  const { clearHistory, clearAICache } = useApp();
  const { user, signOut, isSupabaseConfigured } = useAuth();

  const handleSoundToggle = () => {
    const newValue = !preferences.soundEffects;
    setPreferences({ soundEffects: newValue });
    enableSound(newValue);
    if (newValue) {
      sounds.success();
      toast.success('Sound effects enabled');
    } else {
      toast.success('Sound effects disabled');
    }
  };

  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleClearAll = () => {
    clearHistory();
    clearAllCache();
    resetPreferences();
    localStorage.removeItem('careersim_onboarded_v1');
    // Clear simulation cached results
    Object.keys(localStorage)
      .filter(k => k.startsWith('sim_result_'))
      .forEach(k => localStorage.removeItem(k));
    setShowClearDialog(false);
    toast.success('All data cleared — reload to start fresh');
  };

  // Detect if already installed as PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        {/* Back */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-black/40 hover:text-black transition-colors mb-8 font-[Inter]"
          style={{ fontSize: '0.82rem' }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ChevronLeft size={16} />
          Home
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <StickFigure pose="thinking" size={64} />
            <div>
              <h1 className="font-[Playfair_Display] text-black" style={{ fontSize: '2rem' }}>
                Settings
              </h1>
              <p className="font-[Inter] text-black/40" style={{ fontSize: '0.82rem' }}>
                Customize your experience
              </p>
            </div>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <Section title="Preferences">
          <div className="space-y-3">
            <ToggleSetting
              label="Sound Effects"
              description="Play subtle audio feedback for interactions"
              enabled={preferences.soundEffects}
              onToggle={handleSoundToggle}
              icon={preferences.soundEffects ? <Volume2 size={16} /> : <VolumeX size={16} />}
            />

            <SelectSetting
              label="Default Timeline View"
              description="Choose which timeline to show first on career pages"
              value={preferences.defaultView}
              options={[
                { value: 'week', label: '1 Week' },
                { value: 'quarter', label: '1 Quarter' },
                { value: 'year', label: '1 Year' },
              ]}
              onChange={(value) => setPreferences({ defaultView: value as 'week' | 'quarter' | 'year' })}
            />

            <ToggleSetting
              label="Auto-save Notes"
              description="Automatically save notes as you type (favorites)"
              enabled={preferences.autoSaveNotes}
              onToggle={() => setPreferences({ autoSaveNotes: !preferences.autoSaveNotes })}
            />

            <SelectSetting
              label="Currency & Region"
              description="Choose salary display currency and regional career context"
              value={preferences.currency}
              options={[
                { value: 'INR', label: '₹ INR - Indian Rupees (India context)' },
                { value: 'USD', label: '$ USD - US Dollars (Global context)' },
              ]}
              onChange={(value) => {
                setPreferences({ currency: value as 'INR' | 'USD' });
                toast.success(`Switched to ${value} - new searches will use ${value === 'INR' ? 'Indian' : 'US'} context`, { duration: 3000 });
              }}
            />

            <ToggleSetting
              label="Show Related Careers"
              description="Display related career suggestions at the bottom of each dossier"
              enabled={preferences.showRelatedCareers}
              onToggle={() => setPreferences({ showRelatedCareers: !preferences.showRelatedCareers })}
            />

            <SelectSetting
              label="Default Dossier Section"
              description="Which section to show first when opening a career dossier"
              value={preferences.defaultDossierTab}
              options={[
                { value: 'timeline', label: 'Day Timeline' },
                { value: 'wlb', label: 'Work-Life Balance' },
                { value: 'learn', label: 'Learn More Resources' },
              ]}
              onChange={(value) => setPreferences({ defaultDossierTab: value as 'wlb' | 'learn' | 'timeline' })}
            />

            <SelectSetting
              label="Roadmap Detail Level"
              description="How much detail to generate in Career Roadmaps"
              value={preferences.roadmapDetailLevel}
              options={[
                { value: 'essential', label: 'Essential — Key milestones only' },
                { value: 'detailed', label: 'Detailed — Milestones + skills (default)' },
                { value: 'comprehensive', label: 'Comprehensive — Full decision points' },
              ]}
              onChange={(value) => setPreferences({ roadmapDetailLevel: value as 'essential' | 'detailed' | 'comprehensive' })}
            />

            <ToggleSetting
              label="Auto-load Trending Careers"
              description="Automatically fetch trending careers when the homepage loads"
              enabled={preferences.autoLoadTrending}
              onToggle={() => setPreferences({ autoLoadTrending: !preferences.autoLoadTrending })}
            />

            <ActionButton
              label="Reset Onboarding Tour"
              description="Show the welcome tour again on next page load"
              icon={<Check size={16} />}
              onClick={() => {
                localStorage.removeItem('careersim_onboarded_v1');
                setPreferences({ showOnboarding: true });
                toast.success('Onboarding tour will show on next page load');
              }}
            />
          </div>
        </Section>

        {/* Data Management */}
        <Section title="Data Management">
          <div className="space-y-3">
            <ActionButton
              label="Clear AI Cache"
              description="Remove cached AI responses (fresh data on next search)"
              icon={<Trash2 size={16} />}
              onClick={() => {
                clearAICache();
                toast.success('AI cache cleared');
              }}
            />

            <ActionButton
              label="Clear Search History"
              description="Remove all previously viewed careers"
              icon={<Trash2 size={16} />}
              onClick={() => {
                clearHistory();
                toast.success('Search history cleared');
              }}
              danger
            />

            <ActionButton
              label="Reset All Settings"
              description="Restore default preferences (keeps history and favorites)"
              icon={<Trash2 size={16} />}
              onClick={() => {
                resetPreferences();
                toast.success('Settings reset to defaults');
              }}
            />

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <AlertDialogTrigger asChild>
                <div>
                  <ActionButton
                    label="Clear All Data"
                    description="Remove everything: history, cache, settings, API key"
                    icon={<Trash2 size={16} />}
                    onClick={() => setShowClearDialog(true)}
                    danger
                  />
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove your history, cache, preferences, simulation results, and API key. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-red-500 text-white hover:bg-red-600">
                    Clear Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>

        {/* Install App */}
        {!isStandalone && (
          <Section title="Install App">
            <div className="border border-black/10 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-black/5 border border-black/10 flex items-center justify-center shrink-0">
                  <Smartphone size={18} className="text-black/50" />
                </div>
                <div className="flex-1">
                  <h4 className="font-[Inter] font-medium text-black/70 mb-1" style={{ fontSize: '0.88rem' }}>
                    Install Career Sim
                  </h4>
                  <p className="font-[Inter] text-black/40 mb-4" style={{ fontSize: '0.78rem' }}>
                    Add to your home screen for a native app experience — works offline too.
                  </p>
                  {isIOS ? (
                    <div className="space-y-2 font-[Inter] text-black/55" style={{ fontSize: '0.8rem' }}>
                      <p className="font-medium text-black/60">On Safari:</p>
                      <ol className="list-decimal list-inside space-y-1 text-black/45" style={{ fontSize: '0.78rem' }}>
                        <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                        <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                        <li>Tap <strong>"Add"</strong> in the top right</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="space-y-2 font-[Inter] text-black/55" style={{ fontSize: '0.8rem' }}>
                      <p className="font-medium text-black/60">On Chrome / Edge:</p>
                      <ol className="list-decimal list-inside space-y-1 text-black/45" style={{ fontSize: '0.78rem' }}>
                        <li>Tap the <strong>three-dot menu</strong> (⋮) in the top right</li>
                        <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                        <li>Follow the prompt to install</li>
                      </ol>
                      <p className="text-black/30 mt-2" style={{ fontSize: '0.72rem' }}>
                        If you see a browser install banner, you can use that too.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Account - only shown when Supabase is configured */}
        {isSupabaseConfigured && (
          <Section title="Account">
            <div className="border border-black/10 p-6">
              {user ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-black/5 border border-black/10 flex items-center justify-center">
                      <User size={16} className="text-black/40" />
                    </div>
                    <div>
                      <p className="font-[Inter] text-black/70" style={{ fontSize: '0.88rem' }}>{user.email}</p>
                      <p className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>History synced across devices</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut();
                      toast.success('Signed out');
                      navigate('/');
                    }}
                    className="flex items-center gap-2 border border-black/15 px-4 py-2 font-[Inter] text-black/50 hover:text-black hover:border-black/30 transition-all"
                    style={{ fontSize: '0.82rem' }}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-[Inter] text-black/60 mb-1" style={{ fontSize: '0.88rem' }}>Not signed in</p>
                    <p className="font-[Inter] text-black/35" style={{ fontSize: '0.78rem' }}>
                      Sign in to sync your history across devices
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/auth')}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 font-[Inter] hover:bg-black/85 transition-colors"
                    style={{ fontSize: '0.82rem' }}
                  >
                    <LogIn size={14} />
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* About */}
        <Section title="About">
          <div className="border border-black/10 p-6">
            <div className="flex items-start gap-4">
              <StickFigure pose="waving" size={48} animate={false} />
              <div>
                <h3 className="font-[Playfair_Display] text-black mb-2" style={{ fontSize: '1.05rem' }}>
                  Career Simulation
                </h3>
                <p className="font-[Inter] text-black/50 mb-3" style={{ fontSize: '0.82rem' }}>
                  Experience any career before you commit. AI-powered career exploration with realistic simulations, interview prep, and personalized insights.
                </p>
                <div className="flex flex-wrap gap-4 font-[Inter] text-black/40" style={{ fontSize: '0.72rem' }}>
                  <span>Version 1.0.0</span>
                  <span>&bull;</span>
                  <span>Powered by Groq (Llama 3.3 70B)</span>
                  <span>&bull;</span>
                  <a href="https://github.com/KamalReddy2901/career-sim" target="_blank" rel="noopener noreferrer" className="underline hover:text-black/60">GitHub</a>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Keyboard Shortcuts Help */}
        <Section title="Keyboard Shortcuts">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { keys: ['Ctrl', 'K'], action: 'Focus search' },
              { keys: ['Esc'], action: 'Go back' },
              { keys: ['Ctrl', 'H'], action: 'Open history' },
              { keys: ['Ctrl', 'Q'], action: 'Open quiz' },
              { keys: ['Ctrl', 'Shift', 'C'], action: 'Compare careers' },
              { keys: ['Ctrl', 'P'], action: 'Print (on detail page)' },
            ].map((shortcut, i) => (
              <div
                key={i}
                className="border border-black/10 p-3 flex items-center justify-between"
              >
                <span className="font-[Inter] text-black/60" style={{ fontSize: '0.82rem' }}>
                  {shortcut.action}
                </span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, j) => (
                    <kbd
                      key={j}
                      className="font-[JetBrains_Mono] text-black/40 border border-black/15 px-2 py-0.5"
                      style={{ fontSize: '0.7rem' }}
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      className="mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="font-[Playfair_Display] text-black mb-4" style={{ fontSize: '1.2rem' }}>
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onToggle,
  icon,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full border border-black/10 p-4 hover:border-black/20 transition-colors text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-black/40">{icon}</span>}
            <h3 className="font-[Inter] text-black" style={{ fontSize: '0.9rem' }}>
              {label}
            </h3>
          </div>
          <p className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
            {description}
          </p>
        </div>
        <div
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-black' : 'bg-black/10'
          }`}
        >
          <motion.div
            className="absolute top-1 w-4 h-4 rounded-full bg-white"
            animate={{ left: enabled ? '22px' : '4px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </div>
    </button>
  );
}

function SelectSetting({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border border-black/10 p-4">
      <div className="mb-3">
        <h3 className="font-[Inter] text-black mb-1" style={{ fontSize: '0.9rem' }}>
          {label}
        </h3>
        <p className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
          {description}
        </p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-black/15 px-3 py-2 font-[Inter] text-black/70 outline-none focus:border-black/40"
        style={{ fontSize: '0.82rem' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({
  label,
  description,
  icon,
  onClick,
  danger,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full border border-black/10 p-4 hover:border-black/20 transition-all text-left group ${
        danger ? 'hover:border-red-200 hover:bg-red-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${danger ? 'text-red-500/40 group-hover:text-red-500' : 'text-black/40'}`}>
          {icon}
        </span>
        <div className="flex-1">
          <h3 className={`font-[Inter] mb-1 ${danger ? 'text-red-600/70' : 'text-black'}`} style={{ fontSize: '0.9rem' }}>
            {label}
          </h3>
          <p className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
