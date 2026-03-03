import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { ChevronLeft, Settings, Volume2, VolumeX, Trash2, Key, Check, LogOut, User, LogIn, Sun, Moon, Monitor } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { usePreferences } from '../hooks/usePreferences';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { clearAllCache, getApiKey, setApiKey, validateApiKey } from '../services/ai';
import { toast } from 'sonner';
import { sounds, enableSound, isSoundOn } from '../utils/sounds';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { preferences, setPreferences, resetPreferences } = usePreferences();
  const { clearHistory, clearAICache, refreshAIStatus } = useApp();
  const { user, signOut, isSupabaseConfigured } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);

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

  const handleClearAll = () => {
    if (window.confirm('Clear all local data including history, cache, and preferences? This cannot be undone.')) {
      clearHistory();
      clearAllCache();
      resetPreferences();
      toast.success('All data cleared');
    }
  };

  const handleUpdateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateApiKey(apiKeyInput.trim());
      if (isValid) {
        setApiKey(apiKeyInput.trim());
        refreshAIStatus();
        setApiKeyInput('');
        toast.success('API key updated successfully!');
      } else {
        toast.error('Invalid API key - please check and try again');
      }
    } catch {
      toast.error('Failed to validate API key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveApiKey = () => {
    if (window.confirm('Remove API key? AI features will be disabled.')) {
      setApiKey('');
      refreshAIStatus();
      toast.success('API key removed');
    }
  };

  const currentKey = getApiKey();

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
            <Settings size={64} className="text-black/15" />
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

        {/* Appearance Section */}
        <Section title="Appearance">
          <div className="space-y-3">
            <p className="font-[Inter] text-black/40 dark:text-white/40 mb-4" style={{ fontSize: '0.82rem' }}>
              Choose how Career Simulation looks to you.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([{ value: 'light', label: 'Light', icon: <Sun size={18} /> }, { value: 'dark', label: 'Dark', icon: <Moon size={18} /> }, { value: 'system', label: 'System', icon: <Monitor size={18} /> }] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2.5 py-5 border transition-all font-[Inter] ${
                    theme === opt.value
                      ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 text-black dark:text-white'
                      : 'border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:border-black/30 dark:hover:border-white/30'
                  }`}
                  style={{ fontSize: '0.78rem' }}
                >
                  {opt.icon}
                  {opt.label}
                  {theme === opt.value && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* API Key Section */}
        <Section title="AI Configuration">
          <div className="space-y-4">
            {currentKey ? (
              <div className="border border-black/10 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-[Inter] text-black/60 mb-1" style={{ fontSize: '0.82rem' }}>
                      API Key Configured
                    </p>
                    <p className="font-[JetBrains_Mono] text-black/30" style={{ fontSize: '0.7rem' }}>
                      {currentKey.substring(0, 8)}{'*'.repeat(32)}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveApiKey}
                    className="flex items-center gap-1.5 text-black/30 hover:text-red-500 transition-colors font-[Inter]"
                    style={{ fontSize: '0.72rem' }}
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
                <p className="font-[Inter] text-black/40" style={{ fontSize: '0.75rem' }}>
                  AI features are enabled. Update below to change your key.
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-black/10 p-6 text-center">
                <Key size={32} className="text-black/20 mx-auto mb-3" />
                <p className="font-[Inter] text-black/40 mb-2" style={{ fontSize: '0.85rem' }}>
                  No API key configured
                </p>
                <p className="font-[Inter] text-black/30" style={{ fontSize: '0.75rem' }}>
                  Add your free Groq API key below to unlock AI features
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter Groq API key..."
                className="flex-1 border border-black/15 px-4 py-2.5 font-[Inter] text-black/70 placeholder:text-black/25 outline-none focus:border-black/40"
                style={{ fontSize: '0.85rem' }}
              />
              <motion.button
                onClick={handleUpdateApiKey}
                disabled={isValidating || !apiKeyInput.trim()}
                className="bg-black text-white px-5 py-2.5 disabled:bg-black/30 font-[Inter]"
                style={{ fontSize: '0.82rem' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isValidating ? 'Validating...' : currentKey ? 'Update' : 'Set Key'}
              </motion.button>
            </div>

            <p className="font-[Inter] text-black/30" style={{ fontSize: '0.72rem' }}>
              Get your free API key at{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-black/50"
              >
                console.groq.com/keys
              </a>
            </p>
          </div>
        </Section>

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
                if (window.confirm('Clear all search history?')) {
                  clearHistory();
                }
              }}
              danger
            />

            <ActionButton
              label="Reset All Settings"
              description="Restore default preferences (keeps history and favorites)"
              icon={<Trash2 size={16} />}
              onClick={() => {
                if (window.confirm('Reset all settings to defaults?')) {
                  resetPreferences();
                  toast.success('Settings reset to defaults');
                }
              }}
            />

            <ActionButton
              label="Clear All Data"
              description="Remove everything: history, cache, settings, API key"
              icon={<Trash2 size={16} />}
              onClick={handleClearAll}
              danger
            />
          </div>
        </Section>

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
