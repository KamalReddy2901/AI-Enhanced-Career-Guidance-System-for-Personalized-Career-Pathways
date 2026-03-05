import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { JOB_TITLES } from '../data/jobs';
import { getJobSuggestions } from '../services/ai';
import { sounds } from '../utils/sounds';

interface MagnifierSearchProps {
  onSearchComplete: (jobTitle: string) => void | Promise<void>;
  isAnimating: boolean;
  setIsAnimating: (v: boolean) => void;
}

export function MagnifierSearch({ onSearchComplete, isAnimating, setIsAnimating }: MagnifierSearchProps) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'found' | 'loading'>('idle');
  const [foundJob, setFoundJob] = useState('');
  const [scanningTitles, setScanningTitles] = useState<string[]>([]);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<boolean>(false);

  // Local fallback suggestions (when no API key)
  const localSuggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return JOB_TITLES.filter(t => t.toLowerCase().includes(q)).slice(0, 7);
  }, [query]);

  // Active suggestions: AI-powered, with user's query as first option
  const suggestions = (() => {
    const q = query.trim();
    if (!q || q.length < 2) return aiSuggestions.length > 0 ? aiSuggestions : localSuggestions;
    const list = aiSuggestions.length > 0 ? aiSuggestions : localSuggestions;
    // Always ensure user's exact text appears first
    const filtered = list.filter(s => s.toLowerCase() !== q.toLowerCase());
    return [q, ...filtered].slice(0, 8);
  })();

  // AI-powered suggestions with debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setAiSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    // Debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current = false;
    setIsFetchingSuggestions(true);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) return;
      try {
        const results = await getJobSuggestions(query.trim());
        if (!abortRef.current) {
          setAiSuggestions(results);
        }
      } catch {
        if (!abortRef.current) setAiSuggestions([]);
      } finally {
        if (!abortRef.current) setIsFetchingSuggestions(false);
      }
    }, 380);

    return () => {
      abortRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const startSearch = useCallback((overrideQuery?: string) => {
    const searchTerm = overrideQuery || query.trim();
    if (!searchTerm || isAnimating) return;

    setShowSuggestions(false);
    const matched = searchTerm;
    setFoundJob(matched);
    setIsAnimating(true);
    setPhase('scanning');
    sounds.typewriter();

    const shuffled = [...JOB_TITLES].sort(() => Math.random() - 0.5).slice(0, 15);
    shuffled.splice(shuffled.length - 2, 0, matched);
    setScanningTitles(shuffled);
    setCurrentScanIndex(0);
  }, [query, isAnimating, setIsAnimating]);

  useEffect(() => {
    if (phase !== 'scanning') return;

    if (currentScanIndex >= scanningTitles.length) {
      setPhase('found');
      sounds.stamp();

      setTimeout(async () => {
        setPhase('loading');
        try {
          await onSearchComplete(foundJob);
        } finally {
          setPhase('idle');
          setIsAnimating(false);
        }
      }, 1200);
      return;
    }

    const isTarget = scanningTitles[currentScanIndex] === foundJob;
    const delay = isTarget ? 800 : 80 + Math.random() * 120;

    const timer = setTimeout(() => {
      setCurrentScanIndex(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [phase, currentScanIndex, scanningTitles, foundJob, onSearchComplete, setIsAnimating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        setQuery(suggestions[selectedSuggestion]);
        startSearch(suggestions[selectedSuggestion]);
      } else {
        startSearch();
      }
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative w-full max-w-xl mx-auto" ref={suggestionsRef}>
      {/* Search Input */}
      <div className="relative">
        <motion.div
          className="relative flex items-center bg-background border-2 border-black/25 rounded-none overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)]"
          animate={phase === 'scanning' ? { borderColor: ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.25)'] } : {}}
          transition={phase === 'scanning' ? { repeat: Infinity, duration: 1.5 } : {}}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestion(-1);
            }}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Enter any job title..."
            disabled={isAnimating}
            className="w-full px-5 py-4 bg-transparent text-black placeholder:text-black/30 font-[Playfair_Display] outline-none disabled:opacity-50"
            style={{ fontSize: '1.1rem', caretColor: 'rgba(0,0,0,0.5)' }}
          />
          <motion.button
            onClick={() => startSearch()}
            disabled={!query.trim() || isAnimating}
            className="px-5 py-4 bg-black text-white hover:bg-black/80 disabled:bg-black/30 transition-colors flex items-center gap-2 shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Search size={18} />
            <span className="hidden sm:inline font-[Inter]" style={{ fontSize: '0.85rem' }}>Investigate</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Typeahead Suggestions */}
      <AnimatePresence>
        {showSuggestions && phase === 'idle' && (suggestions.length > 0 || isFetchingSuggestions) && (
          <motion.div
            className="absolute left-0 right-0 mt-1 z-20 bg-background border-2 border-black/15 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)]"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {/* Loading state */}
            {isFetchingSuggestions && suggestions.length === 0 && (
              <div className="px-5 py-3.5 flex items-center gap-2.5 text-black/35 font-[Inter]" style={{ fontSize: '0.82rem' }}>
                <Loader2 size={13} className="animate-spin shrink-0" />
                <span>Finding matching careers...</span>
              </div>
            )}

            {/* Suggestions list */}
            {suggestions.map((title, i) => {
              const matchIndex = title.toLowerCase().indexOf(query.toLowerCase());
              return (
                <button
                  key={title + i}
                  className={`w-full text-left px-5 py-3 font-[Playfair_Display] transition-colors border-b border-black/5 last:border-0 ${
                    i === selectedSuggestion
                      ? 'bg-black text-white'
                      : 'text-black/70 hover:bg-black/4'
                  }`}
                  style={{ fontSize: '0.95rem' }}
                  onMouseEnter={() => setSelectedSuggestion(i)}
                  onClick={() => {
                    setQuery(title);
                    setShowSuggestions(false);
                    startSearch(title);
                  }}
                >
                  {matchIndex >= 0 ? (
                    <>
                      {title.slice(0, matchIndex)}
                      <span className={i === selectedSuggestion ? 'underline' : 'bg-amber-100/70'}>
                        {title.slice(matchIndex, matchIndex + query.length)}
                      </span>
                      {title.slice(matchIndex + query.length)}
                    </>
                  ) : title}
                </button>
              );
            })}

            {/* Footer hint */}
            <div className="px-5 py-2 border-t border-black/8 flex items-center gap-1.5">
              <p className="font-[Inter] text-black/25 flex items-center gap-1" style={{ fontSize: '0.67rem' }}>
                <Sparkles size={9} />
                AI-predicted suggestions  ·  Any job title works, even made-up ones
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning Overlay */}
      <AnimatePresence>
        {phase === 'scanning' && (
          <motion.div
            className="absolute left-0 right-0 mt-3 z-30"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-background border-2 border-black/20 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  animate={{ rotate: [-5, 5, -5], x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="17" cy="17" r="11" stroke="black" strokeWidth="2.5" />
                    <line x1="25" y1="25" x2="36" y2="36" stroke="black" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 11 11 Q 13 9 15 11" stroke="black" strokeWidth="1" opacity="0.3" fill="none" />
                  </svg>
                </motion.div>
                <div className="flex-1">
                  <p className="font-[Inter] text-black/50" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Scanning classified records...
                  </p>
                  <motion.div className="h-1 bg-black/10 mt-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-black rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(currentScanIndex / scanningTitles.length) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </motion.div>
                </div>
              </div>

              <div className="h-12 overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-white to-transparent z-10" />
                <AnimatePresence mode="popLayout">
                  {currentScanIndex < scanningTitles.length && (
                    <motion.div
                      key={currentScanIndex}
                      className={`text-center py-3 font-[Playfair_Display] ${
                        scanningTitles[currentScanIndex] === foundJob ? 'text-black' : 'text-black/40'
                      }`}
                      style={{ fontSize: '1.1rem' }}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.08 }}
                    >
                      {scanningTitles[currentScanIndex]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Found Result */}
      <AnimatePresence>
        {(phase === 'found' || phase === 'loading') && (
          <motion.div
            className="absolute left-0 right-0 mt-3 z-30"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="black" strokeWidth="2" />
                    <path d="M 10 16 L 14 20 L 22 12" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
                <span className="font-[Inter] text-black/50" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Case File Located
                </span>
              </div>
              <motion.h3
                className="font-[Playfair_Display] text-black"
                style={{ fontSize: '1.5rem' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {foundJob}
              </motion.h3>

              {phase === 'loading' && (
                <motion.div
                  className="flex items-center gap-2 mt-3 pt-3 border-t border-black/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 size={14} className="animate-spin text-black/40" />
                  <span className="font-[Inter] text-black/40 flex items-center gap-1.5" style={{ fontSize: '0.72rem' }}>
                    <Sparkles size={10} />
                    AI is generating a unique dossier for "{foundJob}"...
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text */}
      {phase === 'idle' && !isAnimating && (
        <motion.p
          className="text-center mt-4 font-[Inter] text-black/30"
          style={{ fontSize: '0.78rem' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Type any profession - even made-up ones. AI will research it for you.
        </motion.p>
      )}
    </div>
  );
}
