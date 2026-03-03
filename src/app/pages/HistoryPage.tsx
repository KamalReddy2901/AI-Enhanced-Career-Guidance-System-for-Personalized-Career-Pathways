import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Clock, ArrowRight, Trash2, Scale, Star, Edit2, X, Check, Search } from 'lucide-react';
import { StickFigure } from '../components/StickFigure';
import { useApp } from '../context/AppContext';
import { useFavorites } from '../hooks/useFavorites';
import { toast } from 'sonner';
import { sounds } from '../utils/sounds';

type Tab = 'history' | 'saved';

export function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab: Tab = params.get('tab') === 'saved' ? 'saved' : 'history';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // History state
  const { history, clearHistory, setCurrentJob, setRefinementCount, setComparisonJob, comparisonJobs } = useApp();

  // Favorites state
  const { favorites, removeFavorite, clearFavorites, updateNotes, addFavorite, isFavorite } = useFavorites();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // ── History handlers
  const handleSelectJob = (jobData: typeof history[0]['jobData'], _title?: string) => {
    setCurrentJob(jobData);
    setRefinementCount(0);
    navigate('/job');
  };

  const handleAddToCompare = (jobData: typeof history[0]['jobData'], jobTitle: string) => {
    if (!comparisonJobs[0]) {
      setComparisonJob(0, jobData);
      toast.success(`"${jobTitle}" set as Career A`);
    } else if (!comparisonJobs[1]) {
      setComparisonJob(1, jobData);
      toast.success(`"${jobTitle}" set as Career B - ready to compare!`);
      navigate('/compare');
    } else {
      setComparisonJob(0, comparisonJobs[1]);
      setComparisonJob(1, jobData);
      toast.success(`"${jobTitle}" added to comparison`);
      navigate('/compare');
    }
  };

  // ── Favorites handlers
  const handleEditNotes = (entry: typeof favorites[0]) => {
    setEditingNotes(entry.jobTitle);
    setNotesText(entry.notes || '');
  };

  const handleSaveNotes = (jobTitle: string) => {
    updateNotes(jobTitle, notesText);
    setEditingNotes(null);
    toast.success('Notes saved');
  };

  // ── Time formatter
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-6">
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
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <StickFigure pose="reading" size={60} />
              <div>
                <h1 className="font-[Playfair_Display] text-black" style={{ fontSize: '2rem' }}>
                  {activeTab === 'history' ? 'Investigation History' : 'Saved Careers'}
                </h1>
                <p className="font-[Inter] text-black/40" style={{ fontSize: '0.82rem' }}>
                  {activeTab === 'history'
                    ? `${history.length} career${history.length !== 1 ? 's' : ''} investigated`
                    : `${favorites.length} career${favorites.length !== 1 ? 's' : ''} bookmarked`}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-2">
              {activeTab === 'history' && history.length >= 2 && (
                <motion.button
                  onClick={() => navigate('/compare')}
                  className="flex items-center gap-1.5 text-black/30 hover:text-black transition-colors font-[Inter] border border-black/10 px-2.5 py-1.5 hover:border-black/25"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Scale size={12} />
                  Compare
                </motion.button>
              )}
              {activeTab === 'history' && history.length > 0 && (
                <motion.button
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 text-black/30 hover:text-black transition-colors font-[Inter] border border-black/10 px-2.5 py-1.5 hover:border-black/25"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Trash2 size={12} />
                  Clear
                </motion.button>
              )}
              {activeTab === 'saved' && favorites.length >= 2 && (
                <motion.button
                  onClick={() => navigate('/compare')}
                  className="flex items-center gap-1.5 text-black/30 hover:text-black transition-colors font-[Inter] border border-black/10 px-2.5 py-1.5 hover:border-black/25"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Scale size={12} />
                  Compare
                </motion.button>
              )}
              {activeTab === 'saved' && favorites.length > 0 && (
                <motion.button
                  onClick={() => {
                    if (window.confirm('Clear all saved careers?')) {
                      clearFavorites();
                      toast.success('Saved careers cleared');
                    }
                  }}
                  className="flex items-center gap-1.5 text-black/30 hover:text-black transition-colors font-[Inter] border border-black/10 px-2.5 py-1.5 hover:border-black/25"
                  style={{ fontSize: '0.72rem' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Trash2 size={12} />
                  Clear
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex border-2 border-black/12 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => { setActiveTab('history'); sounds.pageFlip(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-[Inter] transition-all ${
              activeTab === 'history'
                ? 'bg-black text-white'
                : 'text-black/50 hover:bg-black/5 hover:text-black'
            }`}
            style={{ fontSize: '0.82rem' }}
          >
            <Clock size={14} />
            History
            {history.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-sm font-[JetBrains_Mono] ${
                  activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-black/8 text-black/50'
                }`}
                style={{ fontSize: '0.6rem' }}
              >
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('saved'); sounds.pageFlip(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-[Inter] transition-all border-l-2 border-black/12 ${
              activeTab === 'saved'
                ? 'bg-black text-white'
                : 'text-black/50 hover:bg-black/5 hover:text-black'
            }`}
            style={{ fontSize: '0.82rem' }}
          >
            <Star size={14} />
            Saved
            {favorites.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-sm font-[JetBrains_Mono] ${
                  activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-black/8 text-black/50'
                }`}
                style={{ fontSize: '0.6rem' }}
              >
                {favorites.length}
              </span>
            )}
          </button>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {history.length === 0 ? (
                <div className="text-center py-20">
                  <StickFigure pose="searching" size={80} className="mx-auto mb-6 text-black/20" />
                  <p className="font-[Inter] text-black/30 mb-6" style={{ fontSize: '0.92rem' }}>
                    No careers investigated yet
                  </p>
                  <motion.button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-[Inter]"
                    style={{ fontSize: '0.85rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Search size={16} />
                    Start Investigating
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry, i) => {
                    const cat = (entry.jobData.category || '').toLowerCase();
                    const accentBorder = cat.includes('tech') || cat.includes('software') || cat.includes('data')
                      ? 'border-l-4 border-l-blue-300'
                      : cat.includes('health') || cat.includes('medical')
                        ? 'border-l-4 border-l-green-300'
                        : cat.includes('finance') || cat.includes('business')
                          ? 'border-l-4 border-l-amber-300'
                          : cat.includes('creative') || cat.includes('design') || cat.includes('art')
                            ? 'border-l-4 border-l-purple-300'
                            : '';
                    return (
                    <motion.div
                      key={entry.id}
                      className={`border border-black/10 hover:border-black/25 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.04)] transition-all group ${accentBorder}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <button
                        onClick={() => handleSelectJob(entry.jobData, entry.jobTitle)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 border border-black/8 flex items-center justify-center shrink-0">
                              <span className="font-[JetBrains_Mono] text-black/25" style={{ fontSize: '0.72rem' }}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-[Playfair_Display] text-black group-hover:underline" style={{ fontSize: '1.05rem' }}>
                                {entry.jobTitle}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-[Inter] text-black/30" style={{ fontSize: '0.7rem' }}>
                                  {entry.jobData.category}
                                </span>
                                <span className="text-black/15">·</span>
                                <span className="font-[Inter] text-black/30" style={{ fontSize: '0.7rem' }}>
                                  {entry.jobData.avgSalary}
                                </span>
                                <span className="text-black/15">·</span>
                                <span className="font-[Inter] text-black/25 flex items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                  <Clock size={9} />
                                  {formatTime(entry.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCompare(entry.jobData, entry.jobTitle);
                              }}
                              className="hidden group-hover:flex items-center gap-1 text-black/25 hover:text-black/60 transition-colors font-[Inter]"
                              style={{ fontSize: '0.65rem' }}
                            >
                              <Scale size={10} />
                              Compare
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isFavorite(entry.jobTitle)) {
                                  removeFavorite(entry.jobTitle);
                                  sounds.unfavorite();
                                  toast.success(`Removed "${entry.jobTitle}" from saved`);
                                } else {
                                  addFavorite(entry.jobData);
                                  sounds.favorite();
                                  toast.success(`Saved "${entry.jobTitle}"`);
                                }
                              }}
                              className={`transition-colors ${
                                isFavorite(entry.jobTitle)
                                  ? 'text-black'
                                  : 'hidden group-hover:flex text-black/25 hover:text-black/60'
                              }`}
                              title={isFavorite(entry.jobTitle) ? 'Remove from saved' : 'Save career'}
                            >
                              <Star
                                size={13}
                                fill={isFavorite(entry.jobTitle) ? 'currentColor' : 'none'}
                              />
                            </button>
                            <ArrowRight size={15} className="text-black/15 group-hover:text-black transition-colors" />
                          </div>
                        </div>
                      </button>
                    </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="saved"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {favorites.length === 0 ? (
                <div className="text-center py-20">
                  <Star size={72} className="mx-auto mb-6 text-black/8" fill="currentColor" />
                  <p className="font-[Inter] text-black/30 mb-2" style={{ fontSize: '0.92rem' }}>
                    No saved careers yet
                  </p>
                  <p className="font-[Inter] text-black/20 mb-6 max-w-xs mx-auto" style={{ fontSize: '0.82rem' }}>
                    Click the star on any career dossier to save it here
                  </p>
                  <motion.button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 bg-black text-white py-3 px-6 font-[Inter]"
                    style={{ fontSize: '0.85rem' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Explore Careers
                    <ArrowRight size={16} />
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {favorites.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        className="border-2 border-black/10 hover:border-black/20 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] transition-all group"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <button
                          onClick={() => {
                            setCurrentJob(entry.jobData);
                            setRefinementCount(0);
                            navigate('/job');
                          }}
                          className="w-full text-left p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <Star size={16} className="text-black/20 shrink-0 mt-0.5" fill="currentColor" />
                              <div className="flex-1">
                                <h3 className="font-[Playfair_Display] text-black group-hover:underline" style={{ fontSize: '1.1rem' }}>
                                  {entry.jobTitle}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="font-[Inter] text-black/30" style={{ fontSize: '0.7rem' }}>
                                    {entry.jobData.category}
                                  </span>
                                  <span className="text-black/15">·</span>
                                  <span className="font-[Inter] text-black/30" style={{ fontSize: '0.7rem' }}>
                                    {entry.jobData.avgSalary}
                                  </span>
                                  <span className="text-black/15">·</span>
                                  <span className="font-[Inter] text-black/22" style={{ fontSize: '0.65rem' }}>
                                    Saved {formatTime(entry.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ArrowRight size={15} className="text-black/15 group-hover:text-black transition-colors shrink-0 ml-2" />
                          </div>

                          {/* Notes */}
                          {(entry.notes || editingNotes === entry.jobTitle) && (
                            <div className="mt-2 pt-2 border-t border-black/5" onClick={e => e.stopPropagation()}>
                              {editingNotes === entry.jobTitle ? (
                                <div className="flex gap-2">
                                  <textarea
                                    value={notesText}
                                    onChange={e => setNotesText(e.target.value)}
                                    className="flex-1 border border-black/15 p-2 font-[Inter] text-black/70 resize-none outline-none focus:border-black/40"
                                    style={{ fontSize: '0.78rem' }}
                                    rows={2}
                                    placeholder="Add notes about this career..."
                                    autoFocus
                                  />
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => handleSaveNotes(entry.jobTitle)}
                                      className="p-1.5 bg-black text-white hover:bg-black/85"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => setEditingNotes(null)}
                                      className="p-1.5 border border-black/15 hover:border-black/30"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="font-[Inter] text-black/40 italic" style={{ fontSize: '0.78rem' }}>
                                  "{entry.notes}"
                                </p>
                              )}
                            </div>
                          )}
                        </button>

                        {/* Action row */}
                        <div className="flex justify-end gap-3 px-4 pb-3 -mt-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleEditNotes(entry);
                            }}
                            className="flex items-center gap-1 text-black/20 hover:text-black/50 transition-colors font-[Inter]"
                            style={{ fontSize: '0.65rem' }}
                          >
                            <Edit2 size={9} />
                            {entry.notes ? 'Edit notes' : 'Add notes'}
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleAddToCompare(entry.jobData, entry.jobTitle);
                            }}
                            className="flex items-center gap-1 text-black/20 hover:text-black/50 transition-colors font-[Inter]"
                            style={{ fontSize: '0.65rem' }}
                          >
                            <Scale size={9} />
                            Compare
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeFavorite(entry.jobTitle);
                              toast.success('Removed from saved');
                            }}
                            className="flex items-center gap-1 text-black/20 hover:text-red-400 transition-colors font-[Inter]"
                            style={{ fontSize: '0.65rem' }}
                          >
                            <Trash2 size={9} />
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}